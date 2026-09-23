package com.weicheng.qrscanner.domain

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * 拼接策略。
 *
 * 验收标准要求 AAA + BBB + CCC = AAABBBCCC，且**不能**自动加换行。
 */
class JoinStrategyTest {

    @Test
    fun `直接拼接不插入任何分隔符`() {
        assertEquals("HelloWorld", JoinStrategy.Direct.join(listOf("Hello", "World")))
    }

    @Test
    fun `直接拼接三段内容`() {
        assertEquals("AAABBBCCC", JoinStrategy.Direct.join(listOf("AAA", "BBB", "CCC")))
    }

    @Test
    fun `单张内容保持原样`() {
        assertEquals("Hello", JoinStrategy.Direct.join(listOf("Hello")))
    }

    @Test
    fun `空列表拼接为空字符串`() {
        assertEquals("", JoinStrategy.Direct.join(emptyList()))
    }

    @Test
    fun `内容中的换行不会被抹掉`() {
        // 只有「拼接时新增的分隔符」才是禁止的；内容自带的换行必须原样保留。
        assertEquals("a\nb", JoinStrategy.Direct.join(listOf("a\n", "b")))
    }

    @Test
    fun `预留的换行拼接策略可用`() {
        // 第二阶段功能，这里只确保扩展点确实能工作。
        assertEquals("Hello\nWorld", JoinStrategy.separated("\n").join(listOf("Hello", "World")))
    }

    @Test
    fun `预留的自定义分隔符策略可用`() {
        assertEquals("AAA|BBB", JoinStrategy.separated("|").join(listOf("AAA", "BBB")))
    }
}
