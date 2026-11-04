package re.tracekeep.core.timestamp

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 阶段 8 接口层测试：验证"未存证"语义与诚实性约束（不接入任何未核实服务商）。
 */
class NoOpProviderTest {

    @Test
    fun noOpTimestamp_reportsNotConfigured_neverSuccess() {
        val provider = NoOpTimestampProvider
        assertEquals("none", provider.providerId)
        assertTrue(provider.availability() is TimestampAvailability.NotConfigured)
        val result = provider.requestTimestamp("abc123")
        assertTrue("NoOp 实现必须返回 NotAttempted（从未尝试），不得返回 Success", result is TimestampResult.NotAttempted)
    }

    @Test
    fun notAttempted_isDistinctFromFailed() {
        // "未尝试"（未配置）与"失败"（尝试过但失败）语义不同：报告须区分
        val notAttempted: TimestampResult = TimestampResult.NotAttempted("no provider")
        val failed: TimestampResult = TimestampResult.Failed("p1", "timeout")
        assertTrue(notAttempted is TimestampResult.NotAttempted)
        assertTrue(failed !is TimestampResult.NotAttempted)
    }
}
