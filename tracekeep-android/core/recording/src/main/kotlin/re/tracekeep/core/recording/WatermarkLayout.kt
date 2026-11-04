package re.tracekeep.core.recording

/**
 * 水印在视频帧内的坐标布局（纯 JVM，可单元测试；Android 端把矩阵值交给 `android.graphics.Matrix`）。
 *
 * 背景（需求：预览画面和输出画面的坐标映射、横竖屏方向及旋转、视频裁剪）：
 * CameraX 的叠加画布使用**缓冲区坐标**（未旋转的传感器方向，可能带裁剪矩形），
 * 而播放时整个画面按 [rotationDegrees] 顺时针旋转后才正立。
 * 本类提供「显示坐标（正立画面）→ 缓冲区坐标」的仿射矩阵，
 * 使水印文字在最终视频中始终正立、且锚定在可见画面的左下角。
 *
 * 矩阵采用 Android `Matrix.setValues` 的 9 元素布局：
 * `[MSCALE_X, MSKEW_X, MTRANS_X, MSKEW_Y, MSCALE_Y, MTRANS_Y, 0, 0, 1]`，
 * 映射关系 `x' = a·x + b·y + c`，`y' = d·x + e·y + f`。
 *
 * 镜像（前置摄像头）：[mirrored] 仅作标记；水平翻转由调用方在显示坐标系内围绕中心执行
 * （本矩阵不含镜像分量）。**前置摄像头镜像行为待真机验证**（见执行日志"待验证项"）。
 */
class WatermarkLayout(
    val cropLeft: Int,
    val cropTop: Int,
    val cropRight: Int,
    val cropBottom: Int,
    rotationDegrees: Int,
    val mirrored: Boolean,
) {

    /** 归一化到 0/90/180/270（非法值按 0 处理并保持不崩溃）。 */
    private val r: Int = ((rotationDegrees % 360) + 360) % 360

    /** 正立显示画面的宽度（缓冲区按旋转后交换宽高）。 */
    val displayWidth: Int
        get() = if (r == 90 || r == 270) cropBottom - cropTop else cropRight - cropLeft

    /** 正立显示画面的高度。 */
    val displayHeight: Int
        get() = if (r == 90 || r == 270) cropRight - cropLeft else cropBottom - cropTop

    /** 显示坐标 → 缓冲区坐标的矩阵（9 元素，Android Matrix 顺序）。 */
    fun displayToBufferMatrix(): FloatArray = when (r) {
        90 -> floatArrayOf(
            0f, 1f, cropLeft.toFloat(),
            -1f, 0f, cropBottom.toFloat(),
            0f, 0f, 1f,
        )
        180 -> floatArrayOf(
            -1f, 0f, cropRight.toFloat(),
            0f, -1f, cropBottom.toFloat(),
            0f, 0f, 1f,
        )
        270 -> floatArrayOf(
            0f, -1f, cropRight.toFloat(),
            1f, 0f, cropTop.toFloat(),
            0f, 0f, 1f,
        )
        else -> floatArrayOf(
            1f, 0f, cropLeft.toFloat(),
            0f, 1f, cropTop.toFloat(),
            0f, 0f, 1f,
        )
    }

    /** 测试辅助：按矩阵映射单个点。 */
    fun mapPoint(x: Float, y: Float): Pair<Float, Float> {
        val m = displayToBufferMatrix()
        return (m[0] * x + m[1] * y + m[2]) to (m[3] * x + m[4] * y + m[5])
    }
}
