package com.weicheng.qrscanner.scan

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 取景框几何与点击对焦坐标换算。
 *
 * 坐标换算特别值得测：一旦错位，用户看到的现象只是「点了没反应」，
 * 在真机上极难排查，所以这里把前提写成断言。
 */
class ScanGeometryTest {

    // ---- 取景框 ----

    @Test
    fun `取景框按短边等比计算`() {
        // 竖屏 1080x2000，短边是宽 1080
        assertEquals(1080f * 0.85f, ScanFrame.side(1080f, 2000f), 0.001f)
        // 横屏 2000x1080，短边是高 1080
        assertEquals(1080f * 0.85f, ScanFrame.side(2000f, 1080f), 0.001f)
    }

    @Test
    fun `取景框比原来的 0_72 更大`() {
        // 这是本次改动的目的：引导用户把二维码摆得更大，
        // 而二维码在画面里越大，每个 module 分到的像素就越多。
        val side = ScanFrame.side(1000f, 1000f)
        assertEquals(850f, side, 0.001f)
        assertTrue(side > 1000f * 0.72f)
    }

    @Test
    fun `尺寸为零或负数时不绘制取景框`() {
        assertEquals(0f, ScanFrame.side(0f, 1000f), 0f)
        assertEquals(0f, ScanFrame.side(1000f, 0f), 0f)
        assertEquals(0f, ScanFrame.side(-10f, 1000f), 0f)
    }

    @Test
    fun `尺寸为 NaN 时不绘制取景框`() {
        // 未测量的 Compose 尺寸不会给出 NaN，但显式挡住可以避免画出 NaN 几何。
        assertEquals(0f, ScanFrame.side(Float.NaN, 1000f), 0f)
        assertEquals(0f, ScanFrame.side(1000f, Float.NaN), 0f)
    }

    // ---- 点击坐标换算 ----

    @Test
    fun `覆盖层与预览同尺寸时为恒等映射`() {
        // 这是当前的实际情况：两者都 fillMaxSize 在同一个 Box 里。
        val point = TapFocus.toViewPoint(120f, 340f, 1000f, 2000f, 1000f, 2000f)

        assertNotNull(point)
        assertEquals(120f, point!!.x, 0.001f)
        assertEquals(340f, point.y, 0.001f)
    }

    @Test
    fun `覆盖层与预览尺寸不同时两个轴独立等比缩放`() {
        // 覆盖层 1000x1000，预览 500x2000
        val point = TapFocus.toViewPoint(500f, 500f, 1000f, 1000f, 500f, 2000f)

        assertNotNull(point)
        assertEquals(250f, point!!.x, 0.001f)   // 500 * (500/1000)
        assertEquals(1000f, point.y, 0.001f)     // 500 * (2000/1000)
    }

    @Test
    fun `点击越界时夹到视图边界而不是丢弃`() {
        val point = TapFocus.toViewPoint(9999f, -50f, 1000f, 1000f, 800f, 600f)

        assertNotNull(point)
        assertEquals(800f, point!!.x, 0.001f)
        assertEquals(0f, point.y, 0.001f)
    }

    @Test
    fun `尺寸为零时返回 null`() {
        // PreviewView 在首帧之前尺寸就是 0，这是会真实发生的输入。
        assertNull(TapFocus.toViewPoint(10f, 10f, 0f, 1000f, 800f, 600f))
        assertNull(TapFocus.toViewPoint(10f, 10f, 1000f, 1000f, 0f, 600f))
        assertNull(TapFocus.toViewPoint(10f, 10f, 1000f, 1000f, 800f, 0f))
    }

    @Test
    fun `尺寸为 NaN 时返回 null`() {
        // 裸的 coerceIn 挡不住 NaN（NaN <= 0f 为 false，会被一路带进结果），
        // 所以尺寸的有限性检查是必需的，这几条断言就是它的守卫。
        assertNull(TapFocus.toViewPoint(10f, 10f, Float.NaN, 1000f, 800f, 600f))
        assertNull(TapFocus.toViewPoint(10f, 10f, 1000f, Float.NaN, 800f, 600f))
        assertNull(TapFocus.toViewPoint(10f, 10f, 1000f, 1000f, Float.NaN, 600f))
        assertNull(TapFocus.toViewPoint(10f, 10f, 1000f, 1000f, 800f, Float.NaN))
    }

    @Test
    fun `点击坐标为 NaN 时返回 null`() {
        assertNull(TapFocus.toViewPoint(Float.NaN, 10f, 1000f, 1000f, 800f, 600f))
        assertNull(TapFocus.toViewPoint(10f, Float.NaN, 1000f, 1000f, 800f, 600f))
    }
}
