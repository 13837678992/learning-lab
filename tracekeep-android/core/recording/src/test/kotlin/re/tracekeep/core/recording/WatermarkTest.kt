package re.tracekeep.core.recording

import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 水印文本真实性测试（需求 §3.3：字段来源明确、定位失败不伪造、时间格式含时区、与元数据一致）。
 */
class WatermarkTextFactoryTest {

    private val zone = ZoneId.of("Asia/Shanghai")

    // 2026-10-29 17:30:00 +08:00 = 1793784600000? 用可读常量：epoch 毫秒
    private val startWall = 1_793_784_600_000L // 2026-10-29T09:30:00Z = 17:30 +08:00
    private val nowWall = 1_793_784_660_000L   // +60s

    private fun data(
        location: LocationSnapshot = LocationSnapshot.DISABLED,
        paused: Boolean = false,
    ) = WatermarkData(
        sessionLabel = "TK-ABCD1234",
        startWallMs = startWall,
        zoneId = zone,
        nowWallMs = nowWall,
        paused = paused,
        location = location,
    )

    @Test
    fun lines_containRecSessionLabelAndTimes() {
        val lines = WatermarkTextFactory.lines(data())
        assertEquals(4, lines.size)
        assertTrue(lines[0].contains("REC"))
        assertTrue(lines[0].contains("TK-ABCD1234"))
        assertTrue(lines[1].startsWith("设备时间"))
        assertTrue(lines[2].startsWith("起录"))
    }

    @Test
    fun timeLines_includeExplicitTimeZoneOffset() {
        val lines = WatermarkTextFactory.lines(data())
        // +08:00 偏移必须显式出现（格式统一，时区明确）
        assertTrue(lines[1], lines[1].contains("+08:00"))
        assertTrue(lines[2], lines[2].contains("+08:00"))
    }

    @Test
    fun pausedState_markedAsPausedNotRec() {
        val lines = WatermarkTextFactory.lines(data(paused = true))
        assertTrue(lines[0].startsWith("暂停中"))
        assertFalse(lines[0].startsWith("● REC"))
    }

    @Test
    fun locationDisabled_showsExplicitUnenabled_notCoordinates() {
        val lines = WatermarkTextFactory.lines(data(LocationSnapshot.DISABLED))
        assertEquals("位置 未启用", lines[3])
    }

    @Test
    fun locationSearching_showsSearchingState() {
        val lines = WatermarkTextFactory.lines(data(LocationSnapshot.SEARCHING))
        assertEquals("位置 定位中…", lines[3])
    }

    @Test
    fun locationUnavailable_showsUnavailable_neverFabricates() {
        val lines = WatermarkTextFactory.lines(data(LocationSnapshot.UNAVAILABLE))
        assertEquals("位置 不可用", lines[3])
    }

    @Test
    fun locationFixed_showsActualCoordinatesWithAccuracyAndFixTime() {
        val fix = LocationSnapshot(
            state = LocationWatermarkState.FIXED,
            latitude = 31.230416,
            longitude = 121.473701,
            accuracyMeters = 8.5f,
            fixWallMs = nowWall - 3_000,
            provider = "gps",
        )
        val lines = WatermarkTextFactory.lines(data(fix))
        assertTrue(lines[3], lines[3].contains("31.230416"))
        assertTrue(lines[3], lines[3].contains("121.473701"))
        assertTrue(lines[3], lines[3].contains("±8m"))
        assertTrue(lines[3], lines[3].contains("定位 "))
    }

    @Test
    fun shortSessionLabel_isStableAndPrefixed() {
        val label = WatermarkTextFactory.shortSessionLabel("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        assertEquals("TK-A1B2C3D4", label)
        assertEquals("TK-UNKNOWN", WatermarkTextFactory.shortSessionLabel(""))
    }
}

/** 水印坐标映射测试（旋转/裁剪/镜像的纯 JVM 验证）。 */
class WatermarkLayoutTest {

    @Test
    fun rotation0_mapsDisplayToBufferWithCropOffset() {
        val layout = WatermarkLayout(10, 20, 1010, 520, 0, mirrored = false)
        assertEquals(1000, layout.displayWidth)
        assertEquals(500, layout.displayHeight)
        val (x, y) = layout.mapPoint(0f, 0f)
        assertEquals(10f, x, 0.01f)
        assertEquals(20f, y, 0.01f)
    }

    @Test
    fun rotation90_swapsDimensions_andMapsCorners() {
        val layout = WatermarkLayout(0, 0, 1000, 500, 90, mirrored = false)
        // 旋转 90° 后显示画面宽=500 高=1000
        assertEquals(500, layout.displayWidth)
        assertEquals(1000, layout.displayHeight)
        // 显示左下角 (0, 1000) 对应缓冲区右下角 (1000, 500)：
        // x' = dy + cropLeft = 1000；y' = cropBottom - dx = 500
        val (x, y) = layout.mapPoint(0f, 1000f)
        assertEquals(1000f, x, 0.01f)
        assertEquals(500f, y, 0.01f)
    }

    @Test
    fun rotation180_flipsBothAxes() {
        val layout = WatermarkLayout(0, 0, 800, 600, 180, mirrored = false)
        val (x, y) = layout.mapPoint(0f, 0f)
        assertEquals(800f, x, 0.01f)
        assertEquals(600f, y, 0.01f)
    }

    @Test
    fun rotation270_mapsCorners() {
        val layout = WatermarkLayout(0, 0, 1000, 500, 270, mirrored = false)
        assertEquals(500, layout.displayWidth)
        assertEquals(1000, layout.displayHeight)
        // 显示左下角 (0, 1000) 对应缓冲区左上角 (0, 0)：
        // x' = cropRight - dy = 0；y' = dx + cropTop = 0
        val (x, y) = layout.mapPoint(0f, 1000f)
        assertEquals(0f, x, 0.01f)
        assertEquals(0f, y, 0.01f)
    }

    @Test
    fun invalidRotationDegrees_fallsBackToZero_noCrash() {
        val layout = WatermarkLayout(0, 0, 100, 100, 45, mirrored = false)
        assertEquals(100, layout.displayWidth)
        assertEquals(100, layout.displayHeight)
    }
}
