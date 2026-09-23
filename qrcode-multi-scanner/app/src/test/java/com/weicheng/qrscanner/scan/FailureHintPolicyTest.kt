package com.weicheng.qrscanner.scan

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 持续失败提示策略。
 *
 * 对应需求「识别失败时不要立刻提示失败」和「不要频繁弹 Toast」：
 * 短时间的失败必须完全静默，只有持续一段时间没扫出来才提示一次。
 */
class FailureHintPolicyTest {

    /** 用 1 微秒做阈值，让测试里的时间戳保持可读的数字。 */
    private fun policy(threshold: Long = 1_000L) = FailureHintPolicy(thresholdNanos = threshold)

    @Test
    fun `初始状态不显示提示`() {
        assertFalse(policy().isVisible)
    }

    @Test
    fun `第一帧即使时间戳很大也不会立刻提示`() {
        val policy = policy()
        // 第一帧只负责起算，不参与判定——否则进页面就会闪一下提示。
        assertEquals(HintChange.NONE, policy.onFrame(9_999_999_999L, decoded = false))
        assertFalse(policy.isVisible)
    }

    @Test
    fun `未到阈值前一直不提示`() {
        val policy = policy(threshold = 1_000L)
        policy.onFrame(0L, decoded = false)
        assertEquals(HintChange.NONE, policy.onFrame(999L, decoded = false))
        assertFalse(policy.isVisible)
    }

    @Test
    fun `达到阈值时提示一次`() {
        val policy = policy(threshold = 1_000L)
        policy.onFrame(0L, decoded = false)
        assertEquals(HintChange.SHOW, policy.onFrame(1_000L, decoded = false))
        assertTrue(policy.isVisible)
    }

    @Test
    fun `提示显示后持续失败不再重复通知界面`() {
        val policy = policy(threshold = 1_000L)
        policy.onFrame(0L, decoded = false)
        assertEquals(HintChange.SHOW, policy.onFrame(1_000L, decoded = false))

        // 这一点是防刷屏的关键：后续 30 帧全部返回 NONE，界面上只被写过一次。
        repeat(30) { i ->
            assertEquals(HintChange.NONE, policy.onFrame(2_000L + i * 33_000_000L, decoded = false))
        }
    }

    @Test
    fun `整次扫描对界面最多通知两次`() {
        val policy = policy(threshold = 1_000L)
        val changes = mutableListOf<HintChange>()

        // 模拟 30fps 跑 10 秒的连续失败，最后一帧才识别成功
        repeat(300) { i ->
            val last = i == 299
            val change = policy.onFrame(i * 33_000_000L, decoded = last)
            if (change != HintChange.NONE) changes.add(change)
        }

        // 300 帧只产生 SHOW + HIDE 两次通知，中间没有任何冗余的 UI 写入。
        assertEquals(listOf(HintChange.SHOW, HintChange.HIDE), changes)
    }

    @Test
    fun `识别成功后隐藏提示`() {
        val policy = policy(threshold = 1_000L)
        policy.onFrame(0L, decoded = false)
        policy.onFrame(1_000L, decoded = false)
        assertTrue(policy.isVisible)

        assertEquals(HintChange.HIDE, policy.onFrame(2_000L, decoded = true))
        assertFalse(policy.isVisible)
    }

    @Test
    fun `识别成功但本来就没显示时不做任何通知`() {
        val policy = policy()
        assertEquals(HintChange.NONE, policy.onFrame(0L, decoded = true))
    }

    @Test
    fun `隐藏后不重复通知`() {
        val policy = policy(threshold = 1_000L)
        policy.onFrame(0L, decoded = false)
        policy.onFrame(1_000L, decoded = false)
        policy.onFrame(2_000L, decoded = true)

        // 提示已经收起来了，继续识别成功不应再产生 HIDE。
        assertEquals(HintChange.NONE, policy.onFrame(3_000L, decoded = true))
    }

    @Test
    fun `识别成功后重新开始计时`() {
        val policy = policy(threshold = 1_000L)
        policy.onFrame(0L, decoded = false)
        policy.onFrame(1_000L, decoded = false)
        policy.onFrame(2_000L, decoded = true)

        // 换一张码重新扫：计时从零开始，不能沿用上一轮已经走过的时间。
        assertEquals(HintChange.NONE, policy.onFrame(10_000L, decoded = false))
        assertEquals(HintChange.NONE, policy.onFrame(10_500L, decoded = false))
        assertEquals(HintChange.SHOW, policy.onFrame(11_000L, decoded = false))
    }

    @Test
    fun `时间戳回退时重新计时而不是卡住`() {
        val policy = policy(threshold = 1_000L)
        policy.onFrame(10_000L, decoded = false)

        // 时钟源切换导致时间戳倒退，此时 elapsed 为负。若不处理，
        // 判定会一直 `< threshold`，提示永远不出现。
        assertEquals(HintChange.NONE, policy.onFrame(5_000L, decoded = false))

        // 以回退后的时间戳为新起点重新计时。
        assertEquals(HintChange.SHOW, policy.onFrame(6_000L, decoded = false))
    }

    @Test
    fun `默认阈值是 5 秒`() {
        // 短于 5 秒不提示
        val policy = FailureHintPolicy()
        policy.onFrame(0L, decoded = false)
        assertEquals(HintChange.NONE, policy.onFrame(4_999_999_999L, decoded = false))
        assertEquals(HintChange.SHOW, policy.onFrame(5_000_000_000L, decoded = false))
    }
}
