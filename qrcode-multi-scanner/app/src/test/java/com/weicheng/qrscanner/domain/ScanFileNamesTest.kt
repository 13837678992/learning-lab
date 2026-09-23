package com.weicheng.qrscanner.domain

import java.time.LocalDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 导出文件名格式：`二维码扫描_YYYYMMDD_HHmmss.txt`。
 */
class ScanFileNamesTest {

    @Test
    fun `文件名格式符合需求示例`() {
        val timestamp = LocalDateTime.of(2026, 9, 23, 9, 45, 30)

        assertEquals("二维码扫描_20260923_094530.txt", ScanFileNames.txtFileName(timestamp))
    }

    @Test
    fun `个位数的月日时分秒补零`() {
        val timestamp = LocalDateTime.of(2026, 1, 2, 3, 4, 5)

        assertEquals("二维码扫描_20260102_030405.txt", ScanFileNames.txtFileName(timestamp))
    }

    @Test
    fun `扩展名与小写`() {
        val fileName = ScanFileNames.txtFileName(LocalDateTime.of(2026, 12, 31, 23, 59, 59))

        assertTrue(fileName.endsWith(".txt"))
    }

    @Test
    fun `同一秒内生成的名称稳定`() {
        val timestamp = LocalDateTime.of(2026, 9, 23, 9, 45, 30)

        assertEquals(
            ScanFileNames.txtFileName(timestamp),
            ScanFileNames.txtFileName(timestamp),
        )
    }
}
