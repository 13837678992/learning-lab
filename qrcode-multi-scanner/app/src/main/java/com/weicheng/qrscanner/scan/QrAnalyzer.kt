package com.weicheng.qrscanner.scan

import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.weicheng.qrscanner.util.AppLog

/**
 * 二维码分析器：逐帧送 ML Kit 识别，命中后立刻停手。
 *
 * 四个要点：
 * 1. 只识别 QR Code（[BarcodeScannerOptions] 限定格式），不为其他条码类型增加开销；
 * 2. 取的是 [Barcode.getRawValue]，即二维码里的原始文本，不做任何加工；
 * 3. [gate] 保证同一张码只上报一次，且上报后 [analyze] 直接短路返回；
 * 4. 图像**原样直通** ML Kit——从 [ImageProxy.image] 这个 YUV 的 MediaImage 直接构造
 *    [InputImage]，中间不做任何 Bitmap 转换、缩放或压缩。高密度二维码的 module 只有几个像素宽，
 *    任何一次重采样都可能把黑白模块糊在一起，所以这条路径必须保持零拷贝语义。
 *
 * 一个实例只服务「一次扫描尝试」；用户点「扫描下一张」时会新建实例。
 */
class QrAnalyzer(
    private val gate: SingleShotGate,
    private val onDecoded: (String) -> Unit,
    private val failureHint: FailureHintPolicy = FailureHintPolicy(),
    private val onFailureHintChanged: (Boolean) -> Unit = {},
    private val onResolutionKnown: (Int, Int) -> Unit = { _, _ -> },
) : ImageAnalysis.Analyzer {

    private val scanner: BarcodeScanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build(),
    )

    /** 实际生效的分析分辨率只需要记录一次，之后每帧都记就只是噪音。 */
    private var resolutionLogged = false

    override fun analyze(image: ImageProxy) {
        // 已经拿到结果了，后续帧直接丢弃，不再做图像转换与识别。
        if (gate.isConsumed) {
            image.close()
            return
        }

        // 记录真实生效的分辨率。这是真机上唯一能确认分辨率优化是否生效的地方——
        // 代码里写的 1920×1440 只是目标值，设备可能协商出更低的尺寸。
        if (!resolutionLogged) {
            resolutionLogged = true
            AppLog.analysisResolution(image.width, image.height)
            onResolutionKnown(image.width, image.height)
        }

        val mediaImage = image.image
        if (mediaImage == null) {
            image.close()
            return
        }

        // 直接用 CameraX 的原始 MediaImage + 正确的 rotationDegrees 构造 InputImage。
        // 不要改成「转 Bitmap 再传」：那会多一次 YUV→RGB 转换与一次全画幅拷贝，
        // 既增加延迟，又可能因为重采样损失掉高密度二维码赖以解码的高频信息。
        val input = InputImage.fromMediaImage(mediaImage, image.imageInfo.rotationDegrees)
        scanner.process(input)
            .addOnSuccessListener { barcodes ->
                val raw = barcodes.firstNotNullOfOrNull { barcode ->
                    barcode.rawValue?.takeIf { it.isNotEmpty() }
                }

                // 只有抢到闸门的那一帧才允许上报，其余并发帧在此被静默丢弃。
                if (raw != null && gate.tryConsume()) {
                    onDecoded(raw)
                }

                // 持续没扫出来才给一次引导提示。策略内部保证整次扫描最多触发两次
                // 状态变更（显示一次、隐藏一次），所以这里不做任何额外节流也不会刷屏。
                val change = failureHint.onFrame(image.imageInfo.timestamp, decoded = raw != null)
                if (change != HintChange.NONE) {
                    onFailureHintChanged(failureHint.isVisible)
                }
            }
            .addOnFailureListener { error ->
                // 识别失败不弹窗、不打断扫描，只记录一条不含内容的告警。
                AppLog.warn("barcode process failed", error)
            }
            .addOnCompleteListener {
                // 必须在结束时关闭，否则 ImageAnalysis 不再产出新帧。
                image.close()
            }
    }

    /** 释放 ML Kit 资源，由调用方在离开扫码页时调用。 */
    fun close() {
        scanner.close()
    }
}
