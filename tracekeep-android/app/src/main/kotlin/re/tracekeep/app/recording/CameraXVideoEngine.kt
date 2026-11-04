package re.tracekeep.app.recording

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import androidx.camera.core.CameraEffect
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.core.UseCaseGroup
import androidx.camera.effects.OverlayEffect
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FallbackStrategy
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.PendingRecording
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.nio.file.Path
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import re.tracekeep.core.recording.EngineResult
import re.tracekeep.core.recording.RecordingEngine
import re.tracekeep.core.recording.VideoRecordingConfig

/**
 * CameraX 摄像头录像引擎（Android 实现；需求 §3 摄像头录像）。
 *
 * 水印（需求 §3.2：水印必须进入最终视频）：
 * - 启用时通过官方 `OverlayEffect`（androidx.camera.effects 1.4.2）以
 *   `VIDEO_CAPTURE` 为目标把水印绘制进**编码器输入帧**——水印进入最终视频文件；
 *   队列深度 0（官方对静态水印的建议）；
 * - 目标组合选择依据（2026-10-29 模拟器实测）：`PREVIEW | VIDEO_CAPTURE` 组合在
 *   模拟器 SwiftShader GL 上导致整个效果管线停摆（预览黑屏 + 编码器无有效帧，
 *   Finalize ERROR_NO_VALID_DATA）；仅 `VIDEO_CAPTURE` 稳定工作且满足"水印在最终视频"要求。
 *   真机上 `PREVIEW | VIDEO_CAPTURE` 是否可用待真机验证（见执行日志待验证项）；
 *   当前实现下实时预览不含水印（预览为原始画面），界面另有独立的录制状态提示；
 * - 水印内容由 [WatermarkOverlayRenderer] 逐帧绘制（设备时间/起录时间/实际定位或缺失状态）；
 * - 水印**不产生二次转码产物**：录制的文件本身就是带水印的原始件，
 *   与 [re.tracekeep.core.storage.EvidenceStore] 的原始媒体保护规则一致（无覆盖、无改写）；
 * - 若 OverlayEffect 初始化失败（设备不支持等），启动**如实失败**（不降级为"无水的录制"），
 *   由控制器标记未完成——绝不出现"以为有水上印、实际没有"的静默降级。
 *
 * 诚实性约束与契约：
 * - [VideoRecordingConfig.targetQuality] 是**请求参数**；设备可能以更低/不同分辨率落盘
 *   （FallbackStrategy 回退），实际分辨率由停止后 MediaMetadataRetriever 读回并标注 observed=true；
 * - [stop] 阻塞等待 CameraX `VideoRecordEvent.Finalize`（容器封装事件，最长 15 秒），
 *   仅当 `error == ERROR_NONE` 才返回 Ok；超时或封装错误返回 Failure；
 * - 录制中切换摄像头：CameraX VideoCapture **不支持**（切换需重建绑定并会终止当前录制），
 *   本引擎如实返回 Failure 并记录；录制前的摄像头朝向通过配置选择；
 * - 录制期间**始终保留取景预览**（避免任何"隐蔽录制"观感）；
 * - [abort] 停止录制并保留已写入字节（不删除文件），由存储层标记未完成。
 *
 * 线程契约：start/stop/pause/resume/abort 由 RecordingSessionHolder 的后台单线程调用
 * （stop 需等待封装事件，不得阻塞主线程）；[bindPreview]/[unbindAll] 可从任意线程调用
 * （内部会同步切换至主线程执行 CameraX 绑定）。
 *
 * 已知限制（真机待验）：部分设备不支持 pause/resume；质量回退行为因 ROM 而异；
 * OverlayEffect 在部分低端设备可能不可用（如实失败）；前置摄像头镜像下水印方向待真机验证。
 */
class CameraXVideoEngine(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner,
    private val config: VideoRecordingConfig,
    private val onError: (String) -> Unit,
    private val watermarkRenderer: WatermarkOverlayRenderer? = null,
    private val pausedProvider: () -> Boolean = { false },
) : RecordingEngine {

    private val mainExecutor = ContextCompat.getMainExecutor(context)
    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * OverlayEffect 专用 GL 线程：官方文档明确该 Handler 用于「执行 OpenGL 操作」。
     * 独立线程避免与主线程（Compose 渲染/交互）争用——模拟器实测显示主线程 GL 争用
     * 会造成管线停摆（预览黑屏、编码器无有效帧）；同时保证绘制线程与录制主流程解耦。
     */
    private val overlayThread = HandlerThread("tracekeep-watermark-gl").apply { start() }
    private val overlayHandler = Handler(overlayThread.looper)
    private var provider: ProcessCameraProvider? = null
    private var recording: Recording? = null
    private var previewView: PreviewView? = null
    private var overlayEffect: OverlayEffect? = null
    private var lensFacing: Int = if (config.cameraFacing == "front") {
        CameraSelector.LENS_FACING_FRONT
    } else {
        CameraSelector.LENS_FACING_BACK
    }

    private var finalizeLatch: CountDownLatch? = null
    private var finalizedError: Int? = null

    /** 当前朝向（"back"/"front"）。 */
    override fun currentCameraFacing(): String =
        if (lensFacing == CameraSelector.LENS_FACING_FRONT) "front" else "back"

    /** 已绘制水印帧数；未配置水印时返回 null（事件中不出现该字段）。 */
    override fun watermarkFramesDrawn(): Long? = watermarkRenderer?.drawnFrameCount()

    /** 预览是否已绑定到该 view 实例（供 UI 防重复绑定）。 */
    fun isAttachedTo(view: PreviewView): Boolean = previewView === view

    /**
     * 绑定取景预览（录制前/录制中均可见）。可从任意线程调用（内部切主线程）。
     * 失败抛出异常由调用方如实处理（预览不可用时不进入录像流程）。
     */
    @SuppressLint("RestrictedApi")
    fun bindPreview(previewView: PreviewView) {
        this.previewView = previewView
        val p = provideProviderBlocking()
        runOnMainAndWait {
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }
            val selector = CameraSelector.Builder().requireLensFacing(lensFacing).build()
            p.unbindAll()
            p.bindToLifecycle(lifecycleOwner, selector, preview)
        }
    }

    /** 释放相机绑定（离开录像界面时调用）。 */
    fun unbindAll() {
        val p = provider ?: return
        runOnMainAndWait {
            runCatching { p.unbindAll() }
            runCatching { overlayEffect?.close() }
            overlayEffect = null
        }
    }

    /**
     * 录制开始**前**切换摄像头（更新朝向并重绑预览）。
     * 录制中调用返回 Failure（CameraX 重绑会终止当前录制；由控制器如实记录）。
     */
    fun setLensFacing(facing: String): EngineResult {
        if (recording != null) {
            return EngineResult.Failure("cannot switch lens while recording")
        }
        lensFacing = if (facing == "front") {
            CameraSelector.LENS_FACING_FRONT
        } else {
            CameraSelector.LENS_FACING_BACK
        }
        previewView ?: return EngineResult.Ok
        return try {
            rebindPreviewOnly()
            EngineResult.Ok
        } catch (e: Exception) {
            EngineResult.Failure("lens switch failed: ${e.message ?: e::class.simpleName}")
        }
    }

    override fun outputFileNames(): List<String> = listOf("media.${config.fileExtension}")

    override fun start(outputFiles: Map<String, Path>): EngineResult {
        val targetFile = outputFiles.values.firstOrNull()
            ?: return EngineResult.Failure("no output file provided")
        // 录制需要 CAMERA；带音轨需要 RECORD_AUDIO。未授权即如实失败，不启动（避免 SecurityException）。
        if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.CAMERA)
            != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return EngineResult.Failure("CAMERA permission not granted")
        }
        if (config.audioEnabled &&
            ContextCompat.checkSelfPermission(context, android.Manifest.permission.RECORD_AUDIO)
            != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return EngineResult.Failure("RECORD_AUDIO permission not granted (required for video audio)")
        }
        return try {
            val p = provideProviderBlocking()
            val recorder = Recorder.Builder()
                .setQualitySelector(
                    QualitySelector.from(
                        requestedQuality(),
                        FallbackStrategy.higherQualityOrLowerThan(requestedQuality()),
                    ),
                )
                .setExecutor(mainExecutor)
                .build()
            val videoCapture = VideoCapture.withOutput(recorder)

            // 水印 OverlayEffect：目标 PREVIEW | VIDEO_CAPTURE，队列深度 0（静态水印官方建议）。
            // 初始化/绑定失败 → 启动失败（如实），不降级为无水印录制。
            val effect: OverlayEffect? = watermarkRenderer?.let { renderer ->
                OverlayEffect(
                    // 仅 VIDEO_CAPTURE：水印只经过编码路径，预览保持直接渲染，
                    // 降低 GL 效果管线对预览的连带影响（真机与模拟器行为差异详见执行日志）。
                    CameraEffect.VIDEO_CAPTURE,
                    0,
                    overlayHandler,
                ) { t -> onError("watermark overlay effect error: ${t.message ?: t::class.simpleName}") }
                    .also { e ->
                        e.setOnDrawListener { frame -> renderer.onDraw(frame) }
                    }
            }

            val latch = CountDownLatch(1)
            finalizedError = null
            finalizeLatch = latch

            runOnMainAndWait {
                val selector = CameraSelector.Builder().requireLensFacing(lensFacing).build()
                p.unbindAll()
                val preview = Preview.Builder().build().also { preview ->
                    previewView?.let { preview.setSurfaceProvider(it.surfaceProvider) }
                }

                val groupBuilder = UseCaseGroup.Builder().addUseCase(videoCapture)
                if (previewView != null) {
                    groupBuilder.addUseCase(preview)
                }
                effect?.let { groupBuilder.addEffect(it) }
                val group = groupBuilder.build()

                p.bindToLifecycle(lifecycleOwner, selector, group)
                overlayEffect = effect

                val outputOptions = FileOutputOptions.Builder(targetFile.toFile()).build()
                var pending: PendingRecording = recorder.prepareRecording(context, outputOptions)
                if (config.audioEnabled) {
                    pending = pending.withAudioEnabled()
                }
                recording = pending.start(mainExecutor) { event ->
                    if (event is VideoRecordEvent.Finalize) {
                        finalizedError = event.error
                        latch.countDown()
                        if (event.error != VideoRecordEvent.Finalize.ERROR_NONE) {
                            onError("video finalize error=${event.error}")
                        }
                    }
                }
            }
            EngineResult.Ok
        } catch (e: Exception) {
            cleanupAfterFailure()
            EngineResult.Failure("camera start failed: ${e.message ?: e::class.simpleName}")
        }
    }

    override fun stop(): EngineResult {
        val rec = recording ?: return EngineResult.Failure("not started")
        val latch = finalizeLatch ?: return EngineResult.Failure("internal state missing")
        return try {
            rec.stop()
            val finalized = latch.await(FINALIZE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            val error = finalizedError
            when {
                !finalized -> EngineResult.Failure("finalize timeout (${FINALIZE_TIMEOUT_SECONDS}s)")
                error == null -> EngineResult.Failure("finalize state unknown")
                error == VideoRecordEvent.Finalize.ERROR_NO_VALID_DATA ->
                    // 编码器未收到有效帧（水印 GL 管线在部分环境馈帧不足的已知形态）；
                    // 给出可操作建议而非仅错误码（失败原因同样写入事件日志）。
                    EngineResult.Failure(
                        "编码器未收到有效数据（ERROR_NO_VALID_DATA）。" +
                            "如设备为软件渲染或低端机型，可尝试：关闭「视频水印」开关后重新录制",
                    )
                error != VideoRecordEvent.Finalize.ERROR_NONE ->
                    EngineResult.Failure("finalize error code=$error")
                else -> {
                    recording = null
                    rebindPreviewOnly()
                    EngineResult.Ok
                }
            }
        } catch (e: Exception) {
            EngineResult.Failure("stop failed: ${e.message ?: e::class.simpleName}")
        }
    }

    override fun pause(): EngineResult {
        val rec = recording ?: return EngineResult.Failure("not started")
        return try {
            rec.pause()
            EngineResult.Ok
        } catch (e: RuntimeException) {
            EngineResult.Failure("pause not supported or failed: ${e.message}")
        }
    }

    override fun resume(): EngineResult {
        val rec = recording ?: return EngineResult.Failure("not started")
        return try {
            rec.resume()
            EngineResult.Ok
        } catch (e: RuntimeException) {
            EngineResult.Failure("resume not supported or failed: ${e.message}")
        }
    }

    override fun switchCamera(): EngineResult =
        EngineResult.Failure(
            "camera switch during active recording is not supported by this implementation" +
                " (CameraX rebinds and would terminate the current recording)",
        )

    override fun abort() {
        val rec = recording
        recording = null
        runCatching { rec?.close() }
        runCatching { rebindPreviewOnly() }
    }

    /** 会话结束释放 GL 线程（由 holder 在引擎废弃时调用）。 */
    fun shutdown() {
        runCatching { overlayEffect?.close() }
        overlayEffect = null
        runCatching { overlayThread.quitSafely() }
    }

    // ---------------------------------------------------------------- 内部

    private fun requestedQuality(): Quality = when (config.targetQuality.uppercase()) {
        "UHD", "4K" -> Quality.UHD
        "FHD", "1080P" -> Quality.FHD
        "HD", "720P" -> Quality.HD
        else -> Quality.FHD
    }

    private fun provideProviderBlocking(): ProcessCameraProvider {
        provider?.let { return it }
        val future = ProcessCameraProvider.getInstance(context)
        val p = future.get(PROVIDER_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        provider = p
        return p
    }

    private fun rebindPreviewOnly() {
        val p = provider ?: return
        val view = previewView ?: return
        runOnMainAndWait {
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(view.surfaceProvider)
            }
            val selector = CameraSelector.Builder().requireLensFacing(lensFacing).build()
            p.unbindAll()
            p.bindToLifecycle(lifecycleOwner, selector, preview)
        }
    }

    private fun cleanupAfterFailure() {
        recording = null
        runCatching { rebindPreviewOnly() }
    }

    /**
     * 在相机操作线程契约下执行主线程操作：若当前已在主线程则直接执行（避免自等待死锁），
     * 否则投递到主线程并同步等待结果。bindToLifecycle 等 CameraX 调用需要主线程 Looper。
     */
    private fun runOnMainAndWait(block: () -> Unit) {
        if (isMainThread()) {
            block()
            return
        }
        val latch = CountDownLatch(1)
        var failure: Throwable? = null
        mainExecutor.execute {
            try {
                block()
            } catch (t: Throwable) {
                failure = t
            } finally {
                latch.countDown()
            }
        }
        if (!latch.await(MAIN_OP_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
            throw IllegalStateException("main-thread camera operation timed out")
        }
        failure?.let { throw it }
    }

    private fun isMainThread(): Boolean =
        Looper.myLooper() == Looper.getMainLooper()

    companion object {
        private const val PROVIDER_TIMEOUT_SECONDS = 10L
        private const val FINALIZE_TIMEOUT_SECONDS = 15L
        private const val MAIN_OP_TIMEOUT_SECONDS = 10L
    }
}
