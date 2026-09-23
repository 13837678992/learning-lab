package com.weicheng.qrscanner.domain

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * 导出文件名生成。
 *
 * 格式固定为 `二维码扫描_yyyyMMdd_HHmmss.txt`，例如 `二维码扫描_20260923_094530.txt`。
 * 抽成独立对象是为了能在 JVM 单元测试里用固定时间断言，避免依赖真实时钟。
 */
object ScanFileNames {

    const val PREFIX = "二维码扫描"
    const val EXTENSION = "txt"
    const val EXTENSION_MIME = "text/plain"

    private val TIMESTAMP_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")

    fun txtFileName(timestamp: LocalDateTime): String =
        "${PREFIX}_${timestamp.format(TIMESTAMP_FORMAT)}.$EXTENSION"

    /** 使用当前本地时间生成文件名。 */
    fun txtFileNameNow(): String = txtFileName(LocalDateTime.now())
}
