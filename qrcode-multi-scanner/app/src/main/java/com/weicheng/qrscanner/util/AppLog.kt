package com.weicheng.qrscanner.util

import android.util.Log
import com.weicheng.qrscanner.BuildConfig

/**
 * 日志入口。
 *
 * 二维码里可能是密码、Token、配置文件或私密文本，因此这里**刻意不提供**
 * 任何可以传入任意字符串的通用日志方法——只留下按需定义的、字段受限的方法，
 * 让「记录二维码内容」在结构上就写不出来。
 *
 * 允许记录的只有：条码序号、内容长度。
 * 例如：`scan success index=3 contentLength=1250`
 *
 * 新增日志方法时请沿用这个约束：只记录长度、序号、状态，不记录内容本身。
 */
object AppLog {

    private const val TAG = "QrScanner"

    /** 扫码成功。只记录序号与内容长度，绝不记录内容。 */
    fun scanSuccess(index: Int, contentLength: Int) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "scan success index=$index contentLength=$contentLength")
        }
    }

    /** 异常告警。异常的 message/stacktrace 不应包含二维码内容。 */
    fun warn(message: String, throwable: Throwable? = null) {
        Log.w(TAG, message, throwable)
    }

    /**
     * 实际生效的图像分析分辨率。
     *
     * 这是**唯一**能在真机上确认分辨率优化是否生效的手段：分辨率由 CameraX 与设备协商决定，
     * 代码里写的 1920×1440 只是目标值，设备可能给出更低（通常是 1600×1200 / 1440×1080，
     * 也可能仍是 640×480）。`ImageAnalysis.getResolutionInfo()` 在首帧之前返回 null，
     * 所以从第一帧的 ImageProxy 上取最可靠。
     *
     * 若日志里仍是 640x480，说明分辨率协商没生效，高容量二维码就还是扫不出来。
     */
    fun analysisResolution(width: Int, height: Int) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "analysis resolution ${width}x$height")
        }
    }
}
