package re.tracekeep.core.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 时间源一致性检测测试（需求 §4；阶段 6 验收：模拟时间跳变不得悄悄改写历史）。
 * 所有"时间"均为合成读数，不涉及真实设备时钟。
 */
class TimeJumpDetectorTest {

    @Test
    fun firstSample_hasNoBaseline_isConsistent() {
        val v = TimeJumpDetector.compare(null, TimeJumpDetector.Sample(wallMs = 1000, monoMs = 100))
        assertTrue(v is TimeJumpDetector.Verdict.Consistent)
    }

    @Test
    fun stableOffset_isConsistent() {
        val base = TimeJumpDetector.Sample(wallMs = 1_000_000, monoMs = 500)
        // 1 秒后：两钟同步推进 → 偏移不变
        val current = TimeJumpDetector.Sample(wallMs = 1_001_000, monoMs = 1500)
        val v = TimeJumpDetector.compare(base, current)
        assertTrue(v is TimeJumpDetector.Verdict.Consistent)
        assertEquals(0L, (v as TimeJumpDetector.Verdict.Consistent).offsetDeltaMs)
    }

    @Test
    fun smallDrift_withinThreshold_isConsistent() {
        val base = TimeJumpDetector.Sample(wallMs = 1_000_000, monoMs = 500)
        val current = TimeJumpDetector.Sample(wallMs = 1_001_500, monoMs = 1990) // 偏移 +10ms
        assertTrue(TimeJumpDetector.compare(base, current) is TimeJumpDetector.Verdict.Consistent)
    }

    @Test
    fun wallClockAdvanced_detected() {
        val base = TimeJumpDetector.Sample(wallMs = 1_000_000, monoMs = 500)
        // 单调钟只走 1 秒，墙钟却跳了 1 小时 → 偏移 +3599s
        val current = TimeJumpDetector.Sample(wallMs = 4_600_000, monoMs = 1500)
        val v = TimeJumpDetector.compare(base, current)
        assertTrue(v is TimeJumpDetector.Verdict.Anomaly)
        assertEquals(TimeAnomalyKind.WALL_CLOCK_ADVANCED, (v as TimeJumpDetector.Verdict.Anomaly).kind)
        assertTrue(v.deltaMs > 3_000_000)
    }

    @Test
    fun wallClockSetBack_detected() {
        val base = TimeJumpDetector.Sample(wallMs = 5_000_000, monoMs = 500)
        // 单调钟前进 1 秒，墙钟回拨 1 小时 → 偏移 -3601s
        val current = TimeJumpDetector.Sample(wallMs = 1_401_000, monoMs = 1500)
        val v = TimeJumpDetector.compare(base, current)
        assertTrue(v is TimeJumpDetector.Verdict.Anomaly)
        assertEquals(TimeAnomalyKind.WALL_CLOCK_SET_BACK, (v as TimeJumpDetector.Verdict.Anomaly).kind)
        assertTrue(v.deltaMs < -3_000_000)
    }

    @Test
    fun monotonicReset_classifiedAsSuspectNotTampering() {
        // 设备重启：单调钟显著变小；取场景使偏移变化为负（墙钟推进有限而单调钟归零）
        // base 偏移 = 5,000,000 − 4,000,000 = 1,000,000
        val base = TimeJumpDetector.Sample(wallMs = 5_000_000, monoMs = 4_000_000)
        // current：单调钟归零附近（1,000）；墙钟仅推进 1 秒 → 偏移 = 5,001,000 − 1,000 = 5,000,000… 偏正，
        // 因此改用「墙钟被回拨 + 单调钟归零」的组合让偏移显著为负：
        // 偏移 = 1,000 − 1,000 = 0（墙钟也回到引导起点附近）→ 负突变 −1,000,000
        val current = TimeJumpDetector.Sample(wallMs = 1_000, monoMs = 1_000)
        val v = TimeJumpDetector.compare(base, current)
        assertTrue(v is TimeJumpDetector.Verdict.Anomaly)
        assertEquals(
            TimeAnomalyKind.MONOTONIC_RESET_SUSPECTED,
            (v as TimeJumpDetector.Verdict.Anomaly).kind,
        )
    }

    @Test
    fun customThreshold_respected() {
        val base = TimeJumpDetector.Sample(wallMs = 1_000_000, monoMs = 500)
        val current = TimeJumpDetector.Sample(wallMs = 1_003_000, monoMs = 1500) // 偏移 +2s
        // 默认阈值 2s：恰好边界（<=）→ 一致；阈值 1s → 异常
        assertTrue(TimeJumpDetector.compare(base, current) is TimeJumpDetector.Verdict.Consistent)
        assertTrue(TimeJumpDetector.compare(base, current, thresholdMs = 1000) is TimeJumpDetector.Verdict.Anomaly)
    }

    @Test
    fun anomaly_carriesBothOffsetsForAudit() {
        val base = TimeJumpDetector.Sample(wallMs = 1_000_000, monoMs = 500)
        val current = TimeJumpDetector.Sample(wallMs = 4_600_000, monoMs = 1500)
        val a = TimeJumpDetector.compare(base, current) as TimeJumpDetector.Verdict.Anomaly
        assertEquals(999_500L, a.baselineOffsetMs)
        assertEquals(4_598_500L, a.currentOffsetMs)
    }
}
