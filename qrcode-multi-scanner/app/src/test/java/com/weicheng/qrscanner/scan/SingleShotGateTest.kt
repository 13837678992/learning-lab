package com.weicheng.qrscanner.scan

import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicInteger
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 防重复扫的核心闸门。
 *
 * 对应需求「同一个二维码连续多帧被识别到时，只能保存一次」。
 */
class SingleShotGateTest {

    @Test
    fun `抢占前状态为未消费`() {
        val gate = SingleShotGate()

        assertFalse(gate.isConsumed)
    }

    @Test
    fun `只有第一次抢占成功`() {
        val gate = SingleShotGate()

        assertTrue(gate.tryConsume())
        assertFalse(gate.tryConsume())
        assertFalse(gate.tryConsume())
    }

    @Test
    fun `抢占后状态为已消费`() {
        val gate = SingleShotGate()
        gate.tryConsume()

        assertTrue(gate.isConsumed)
    }

    @Test
    fun `模拟连续多帧识别同一张码时只放行一次`() {
        val gate = SingleShotGate()
        val saved = mutableListOf<String>()

        // 模拟 CameraX 连续 20 帧都识别到同一张二维码
        repeat(20) {
            if (gate.tryConsume()) {
                saved.add("第1张")
            }
        }

        assertEquals(listOf("第1张"), saved)
    }

    @Test
    fun `多线程并发抢占只有一个成功`() {
        // ML Kit 的回调与帧解析可能并发，这里用真实并发验证 compareAndSet 的语义：
        // 若实现写成「先判断再赋值」，这个测试会随机失败。
        val gate = SingleShotGate()
        val successCount = AtomicInteger(0)
        val startLatch = CountDownLatch(1)
        val threadCount = 32

        val threads = (1..threadCount).map {
            Thread {
                startLatch.await()
                if (gate.tryConsume()) {
                    successCount.incrementAndGet()
                }
            }
        }

        threads.forEach { it.start() }
        startLatch.countDown()
        threads.forEach { it.join() }

        assertEquals(1, successCount.get())
    }
}
