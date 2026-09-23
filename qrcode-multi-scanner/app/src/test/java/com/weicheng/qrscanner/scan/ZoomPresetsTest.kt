package com.weicheng.qrscanner.scan

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 缩放档位推导。
 *
 * 核心约束：**不假设任何设备都支持 2×**。档位必须完全由设备报出的
 * 最小/最大倍数推导出来，否则在某些机型上点了档位会失败或行为异常。
 */
class ZoomPresetsTest {

    @Test
    fun `普通 1x 到 2x 的设备给出两个档位`() {
        assertEquals(listOf(1f, 2f), ZoomPresets.presets(1f, 2f))
    }

    @Test
    fun `不支持缩放的设备不显示档位`() {
        assertTrue(ZoomPresets.presets(1f, 1f).isEmpty())
    }

    @Test
    fun `最大倍数太小的设备不显示档位`() {
        // 1.2× 只比 1× 大一档都不到，给出来只是噪音。
        assertTrue(ZoomPresets.presets(1f, 1.2f).isEmpty())
    }

    @Test
    fun `最大倍数刚好够一档时仍然给出`() {
        // 1.5 >= 1.0 * 1.4，达到 MIN_STEP 门槛。
        assertEquals(listOf(1f, 1.5f), ZoomPresets.presets(1f, 1.5f))
    }

    @Test
    fun `最大 8x 时把设备最大倍数作为最高档`() {
        assertEquals(listOf(1f, 2f, 3f, 5f, 8f), ZoomPresets.presets(1f, 8f))
    }

    @Test
    fun `最大倍数过大时不把最大倍数做成档位`() {
        // 50× 已经远超 MAX_TOP，纯数码放大没有新信息。
        assertEquals(listOf(1f, 2f, 3f, 5f), ZoomPresets.presets(1f, 50f))
        assertEquals(listOf(1f, 2f, 3f, 5f), ZoomPresets.presets(1f, 100f))
    }

    @Test
    fun `带超广角的设备锚定在 1x 而不是最小倍数`() {
        // 0.5× 是被刻意丢弃的：把画面缩小永远不能帮助看清二维码。
        assertEquals(listOf(1f, 2f, 3f, 5f, 8f), ZoomPresets.presets(0.5f, 8f))
    }

    @Test
    fun `最小倍数已经是 2x 时 2x 不会重复出现`() {
        assertEquals(listOf(2f, 3f, 5f, 8f), ZoomPresets.presets(2f, 8f))
    }

    @Test
    fun `最小倍数大于最大倍数时不显示档位`() {
        assertTrue(ZoomPresets.presets(2f, 1f).isEmpty())
    }

    @Test
    fun `非有限值一律当作不支持`() {
        assertTrue(ZoomPresets.presets(Float.NaN, 8f).isEmpty())
        assertTrue(ZoomPresets.presets(1f, Float.NaN).isEmpty())
        assertTrue(ZoomPresets.presets(Float.POSITIVE_INFINITY, 8f).isEmpty())
        assertTrue(ZoomPresets.presets(1f, Float.POSITIVE_INFINITY).isEmpty())
    }

    @Test
    fun `档位始终升序且不重复`() {
        val presets = ZoomPresets.presets(0.5f, 4f)
        assertEquals(presets.sorted(), presets)
        assertEquals(presets.distinct(), presets)
    }

    @Test
    fun `所有档位都落在设备支持范围内`() {
        val min = 0.5f
        val max = 6f
        ZoomPresets.presets(min, max).forEach { ratio ->
            assertTrue("$ratio 超出了设备范围 $min..$max", ratio in min..max)
        }
    }
}
