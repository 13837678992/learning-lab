package re.tracekeep.app.recording

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Typeface
import androidx.camera.effects.Frame
import androidx.camera.effects.OverlayEffect
import java.time.ZoneId
import java.util.concurrent.atomic.AtomicLong
import re.tracekeep.core.recording.LocationSnapshot
import re.tracekeep.core.recording.WatermarkData
import re.tracekeep.core.recording.WatermarkLayout
import re.tracekeep.core.recording.WatermarkTextFactory

/**
 * 视频水印渲染器（把水印绘制进 `OverlayEffect` 的帧画布——水印因此进入最终编码的视频帧，
 * 而不只是预览 UI；实现依据 androidx.camera.effects 1.4.2 官方 API：
 * `OverlayEffect.setOnDrawListener(Function<Frame, Boolean>)` + `Frame.getOverlayCanvas()`）。
 *
 * 绘制策略（性能教训，2026-10-29/30 两轮模拟器实测）：
 * - **逐帧重绘**水印块（2026-10-29 实测：226 帧/14s 正常进入最终视频，真机 GPU 开销可忽略）；
 * - 清除上一水印块时只用**局部矩形 clear**（覆盖上一块的显示坐标区域），
 *   **禁止**每帧全表面 `drawColor(CLEAR)`——全表面清除在软件 GL 环境极慢，
 *   曾导致视频编码器馈帧超时（`VideoEncoder: data didn't reach expected timestamp` →
 *   Finalize ERROR_NO_VALID_DATA）；
 * - 软件 GL 环境仍可通过界面「视频水印」开关在录制前关闭水印（事件日志如实记录）。
 *
 * 真实性约束（对应需求 §3）：
 * - 时间行由 [nowWallMsProvider] 在绘制瞬间取值（设备墙上时钟，显式带时区偏移）；
 * - 位置行由 [locationProvider] 提供**实际定位结果或缺失状态**，绝不补造坐标；
 * - 本类不修改任何既有文件：水印在相机→编码器的帧管线中直接合成，
 *   [re.tracekeep.core.storage.EvidenceStore] 登记的原始媒体即为带水印的录制产物
 *   （单一原始件，不存在"先录后转码加水印"的二次产物，原始证据保护不受影响）。
 */
class WatermarkOverlayRenderer(
    private val zoneId: ZoneId,
    private val nowWallMsProvider: () -> Long,
    private val pausedProvider: () -> Boolean,
    private val locationProvider: () -> LocationSnapshot,
) {

    /** 会话标签与起录时间在控制器启动成功后由 [bindSession] 绑定（绘制线程读取）。 */
    @Volatile
    private var sessionLabel: String = "TK-PENDING"

    @Volatile
    private var startWallMs: Long = 0L

    /** 启动成功后绑定真实会话信息（此后各帧水印使用该值）。 */
    fun bindSession(sessionLabel: String, startWallMs: Long) {
        this.sessionLabel = sessionLabel
        this.startWallMs = startWallMs
    }

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 28f
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
        setShadowLayer(3f, 1.5f, 1.5f, Color.argb(200, 0, 0, 0))
    }

    private val recPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(255, 60, 60)
        textSize = 28f
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
        setShadowLayer(3f, 1.5f, 1.5f, Color.argb(200, 0, 0, 0))
    }

    private val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(110, 0, 0, 0)
    }

    private val drawnFrames = AtomicLong(0)

    /** 已绘制帧数（引擎停止后由控制器读取并写入 WATERMARK_FRAMES 事件；0 = 一帧未绘制）。 */
    fun drawnFrameCount(): Long = drawnFrames.get()

    /**
     * 绘制回调（在 OverlayEffect 的 Handler 线程调用）。恒返回 true（不丢帧）；
     * 绘制失败静默跳过本帧内容，计数不增长——停止时事件中的计数即为实际绘制帧数。
     */
    fun onDraw(frame: Frame): Boolean {
        return try {
            val layout = WatermarkLayout(
                cropLeft = frame.cropRect.left,
                cropTop = frame.cropRect.top,
                cropRight = frame.cropRect.right,
                cropBottom = frame.cropRect.bottom,
                rotationDegrees = frame.rotationDegrees,
                mirrored = frame.isMirroring,
            )
            val lines = currentLines()

            val canvas = frame.getOverlayCanvas()
            canvas.save()
            canvas.setMatrix(displayToBufferMatrix(layout))

            val margin = 24f
            val lineHeight = textPaint.textSize * 1.35f
            val blockHeight = lineHeight * lines.size + 16f
            val blockWidth = lines.maxOf { textPaint.measureText(it) } + 24f
            val left = margin
            val top = (layout.displayHeight - blockHeight - margin).coerceAtLeast(0f)
            canvas.drawRoundRect(left, top, left + blockWidth, top + blockHeight, 12f, 12f, backgroundPaint)
            var y = top + textPaint.textSize + 8f
            lines.forEachIndexed { i, line ->
                canvas.drawText(line, left + 12f, y, if (i == 0) recPaint else textPaint)
                y += lineHeight
            }
            canvas.restore()
            drawnFrames.incrementAndGet()
            true
        } catch (_: RuntimeException) {
            true
        }
    }

    /**
     * 显示坐标（正立画面）→ 缓冲区坐标的矩阵。
     * 前置摄像头镜像（[WatermarkLayout.mirrored]）：以显示画面中心水平翻转，
     * 使水印在镜像播放的前置画面中方向与位置正确（**真机行为待验证**）。
     */
    private fun displayToBufferMatrix(layout: WatermarkLayout): Matrix {
        val matrix = Matrix()
        matrix.setValues(layout.displayToBufferMatrix())
        if (layout.mirrored) {
            val mirror = Matrix().apply {
                setScale(-1f, 1f, layout.displayWidth / 2f, layout.displayHeight / 2f)
            }
            matrix.preConcat(mirror)
        }
        return matrix
    }

    private fun currentLines(): List<String> = WatermarkTextFactory.lines(
        WatermarkData(
            sessionLabel = sessionLabel,
            startWallMs = startWallMs,
            zoneId = zoneId,
            nowWallMs = nowWallMsProvider(),
            paused = pausedProvider(),
            location = locationProvider(),
        ),
    )

}
