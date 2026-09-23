package com.weicheng.qrscanner.scan

import kotlin.math.min

/**
 * 取景框的几何计算。
 *
 * 取景框本身只是视觉引导（ML Kit 分析的是整帧，见 README），但它的**大小**会实实在在
 * 影响成功率：用户天然会把二维码摆到框里，框越大，二维码在画面里占的面积就越大，
 * 落到每个 QR module 上的像素就越多。高容量二维码恰恰是因为 module 像素不足才扫不出来，
 * 所以这里从 0.72 提到 0.85——在不遮挡取景框四角的前提下尽量做大。
 */
object ScanFrame {

    /** 取景框边长占画面短边的比例。 */
    const val SIDE_RATIO = 0.85f

    /**
     * 取景框边长。
     *
     * 尺寸非法（未测量、或出现 NaN）时返回 0，调用方据此跳过绘制。
     */
    fun side(width: Float, height: Float): Float {
        if (!width.isFinite() || !height.isFinite()) return 0f
        if (width <= 0f || height <= 0f) return 0f
        return min(width, height) * SIDE_RATIO
    }
}

/** 换算后的视图坐标。用普通数据类而不是 `android.graphics.PointF`，以便在 JVM 上单测。 */
data class ViewPoint(val x: Float, val y: Float)

/**
 * 点击对焦的坐标换算。
 *
 * 点击事件发生在 Compose 的覆盖层坐标系里，而 CameraX 的
 * `MeteringPointFactory` 要的是 `PreviewView` 的视图坐标。两者当前都填满同一个
 * `Box`，所以实际是恒等映射；[toViewPoint] 存在的意义是把这个前提写成**可测试的显式契约**，
 * 这样以后布局改动（加边距、换容器）时不会静默失效——点击对焦一旦错位，
 * 表现是「点了没反应」，非常难排查。
 */
object TapFocus {

    /**
     * 把覆盖层上的点击坐标换算成 `PreviewView` 的视图坐标。
     *
     * @return 换算结果；**返回 null 表示这次点击不应触发对焦**。
     */
    fun toViewPoint(
        x: Float,
        y: Float,
        overlayWidth: Float,
        overlayHeight: Float,
        viewWidth: Float,
        viewHeight: Float,
    ): ViewPoint? {
        // 尺寸的有限性检查是必需的，不是装饰：裸的 coerceIn 挡不住 NaN
        // （NaN <= 0f 为 false，会把 NaN 一路带进结果），
        // 而 PreviewView 在首帧之前尺寸就是 0，这是会真实发生的输入。
        if (!overlayWidth.isFinite() || !overlayHeight.isFinite()) return null
        if (!viewWidth.isFinite() || !viewHeight.isFinite()) return null
        if (overlayWidth <= 0f || overlayHeight <= 0f) return null
        if (viewWidth <= 0f || viewHeight <= 0f) return null

        if (!x.isFinite() || !y.isFinite()) return null

        // 两个轴独立等比缩放。
        val scaleX = viewWidth / overlayWidth
        val scaleY = viewHeight / overlayHeight

        // 点在视图外时夹到边界，而不是丢弃：用户点在边缘仍然表达了「对焦到这里」的意图。
        return ViewPoint(
            x = (x * scaleX).coerceIn(0f, viewWidth),
            y = (y * scaleY).coerceIn(0f, viewHeight),
        )
    }
}
