package com.weicheng.qrscanner.scan

import android.util.Size
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import java.util.concurrent.Executor

// 图像分析流的配置。高容量二维码扫不出来的根因就在这个文件里，改动前请先读下面的说明。

/** 分析流的目标分辨率。改这两个常量就能整体调整画质与性能的平衡。 */
private const val ANALYSIS_TARGET_WIDTH = 1920
private const val ANALYSIS_TARGET_HEIGHT = 1440

/** 设备不支持目标尺寸时，退而求其次的起点。 */
private val ANALYSIS_TARGET_SIZE = Size(ANALYSIS_TARGET_WIDTH, ANALYSIS_TARGET_HEIGHT)

/**
 * 分析流的分辨率选择器。
 *
 * ## 为什么必须显式配置
 *
 * CameraX 的 `ImageAnalysis.Builder()` 在没有任何配置时继承 `ImageAnalysis.DEFAULT_CONFIG`，
 * 其目标分辨率写死为 **640×480**（可在 `camera-core` 的字节码里确认）。
 * 对普通二维码够用，但对高密度二维码：
 *
 * ```
 * 二维码占画面宽度的一半
 *   V10 码（ 57×57 模块）在 640px 宽画面里 → 约 5.6 px/module  ✅ 能识别
 *   V30 码（137×137 模块）在 640px 宽画面里 → 约 2.3 px/module  ❌ 低于 ML Kit 的下限
 * ```
 *
 * ML Kit 稳定解码大致需要 3–4 px/module。所以对高容量二维码，唯一有效的办法
 * 就是在送进 ML Kit **之前**让画面里有足够多的像素。这也是为什么本次只做分辨率、
 * 对焦、缩放这三件基础的事，而不去做二值化、锐化、超分辨率——
 * 那些都是在像素本来就不够的前提下修修补补。
 *
 * ## 为什么用 4:3 的 1920×1440 而不是 16:9 的 1920×1080
 *
 * 1. **视野。** 4:3 是传感器原生画幅，16:9 是它的上下裁切。因为 ML Kit 分析的是整帧
 *    （不做裁剪，见 README），4:3 保留了更完整的视野，二维码更容易完整入画——
 *    而「二维码没完整入画」恰恰是用户在现场最难自行补救的失败模式。
 * 2. **像素。** 1920×1440 是 2.76MP，比 1080p 的 2.07MP 多出 33%。
 * 3. 预览是 `FILL_CENTER`，会把 4:3 画面裁切填满屏幕，所以**分析区域只会比预览所见更大**，
 *    不会出现「预览里看得见、分析却看不到」的情况。
 *
 * ## 为什么不封顶会更好，这里却封了顶
 *
 * 用 [ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER] 是**上不封顶**的：
 * 设备不支持 1920×1440 时就取最接近的更低尺寸（通常是 1600×1200 或 1440×1080，
 * 仍是 VGA 的 4–6 倍像素）。
 *
 * 刻意不用 CameraX 默认的 `CLOSEST_HIGHER_THEN_LOWER`：某些设备的 4:3 列表里有
 * 2048×1536 甚至 4032×3024，向上取会让 CameraX 悄悄选出一个 3–12MP 的流，
 * ML Kit 每帧多花几百毫秒，而解码率一点没提高。**可预测比多榨那点像素更重要。**
 *
 * 最坏情况是设备只支持 VGA——那也只是退化成改动前的行为，不会比现在更差，
 * 更不会出现 `bindToLifecycle` 绑定失败。
 *
 * ## 与 Preview 的关系
 *
 * 这里只配置分析流。Preview 用什么分辨率取决于显示效果，两者必须分开设置——
 * **不能因为预览用了低分辨率，就让分析也跟着低**，送进 ML Kit 的始终是分析流。
 *
 * 用 [ResolutionSelector] 而不是已经废弃的 `setTargetResolution`。也不要两者同时使用。
 */
fun analysisResolutionSelector(): ResolutionSelector =
    ResolutionSelector.Builder()
        .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
        .setResolutionStrategy(
            ResolutionStrategy(
                ANALYSIS_TARGET_SIZE,
                ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER,
            ),
        )
        .build()

/**
 * 构建图像分析用例。
 *
 * @param executor 分析线程。调用方传入的是单线程 executor，这本身就是一层节流：
 *   配合 [ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST]，任何时刻最多只有一个 ML Kit 任务在跑，
 *   不会堆积 ImageProxy，也不会因为并发识别把 CPU 占满导致预览掉帧。
 */
fun buildImageAnalysis(
    executor: Executor,
    analyzer: ImageAnalysis.Analyzer,
): ImageAnalysis =
    ImageAnalysis.Builder()
        .setResolutionSelector(analysisResolutionSelector())
        // 只保留最新一帧。CameraX 在这一帧被 close 之前不会再投递下一帧，
        // 所以「上一帧还没处理完就丢弃当前帧」是结构性保证的，不需要额外的帧计数逻辑。
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        // 显式声明 YUV，让 QrAnalyzer 里 InputImage.fromMediaImage(image.image, ...)
        // 的直通路径成为契约而不是巧合。
        //
        // 绝对不要改成 OUTPUT_IMAGE_FORMAT_RGBA_8888：那会强制 CameraX 在分析线程上
        // 做一次 YUV→RGBA 转换、拷贝量翻倍，正好与「降低每帧延迟」相反。
        .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
        .build()
        .also { it.setAnalyzer(executor, analyzer) }
