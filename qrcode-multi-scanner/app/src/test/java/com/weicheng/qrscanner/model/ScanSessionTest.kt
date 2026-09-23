package com.weicheng.qrscanner.model

import com.weicheng.qrscanner.domain.JoinStrategy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 多张扫描数据模型的行为约束。
 *
 * 这里覆盖的是验收标准里最硬的一条：
 * 分别扫描 AAA / BBB / CCC 后，最终文本必须是 AAABBBCCC。
 */
class ScanSessionTest {

    private fun sessionOf(vararg contents: String): ScanSession =
        contents.fold(ScanSession()) { session, content -> session.append(content) }

    @Test
    fun `三张内容按扫描顺序直接拼接`() {
        val session = sessionOf("AAA", "BBB", "CCC")

        assertEquals("AAABBBCCC", session.join(JoinStrategy.Direct))
    }

    @Test
    fun `每张内容独立保存而不是边扫边拼`() {
        val session = sessionOf("AAA", "BBB", "CCC")

        assertEquals(listOf("AAA", "BBB", "CCC"), session.items.map { it.content })
        assertEquals(3, session.count)
    }

    @Test
    fun `index 从 1 开始且与列表顺序一致`() {
        val session = sessionOf("AAA", "BBB", "CCC")

        assertEquals(listOf(1, 2, 3), session.items.map { it.index })
    }

    @Test
    fun `内容原样保存不 trim 不补换行`() {
        val session = sessionOf("  Hello\n", "World  ")

        // 分隔符绝不能由保存环节偷偷加上：只有 JoinStrategy 才能决定怎么拼。
        assertEquals("  Hello\nWorld  ", session.join(JoinStrategy.Direct))
    }

    @Test
    fun `换行不再被当作分隔符`() {
        val session = sessionOf("Hello", "World")

        assertEquals("HelloWorld", session.join(JoinStrategy.Direct))
    }

    @Test
    fun `删除中间一张后其余条目重新编号`() {
        val session = sessionOf("AAA", "BBB", "CCC")
        val second = session.items[1]

        val afterDelete = session.delete(second.id)

        assertEquals(listOf("AAA", "CCC"), afterDelete.items.map { it.content })
        // 关键：序号必须连续，否则界面显示的「第 N 张」会和拼接顺序对不上。
        assertEquals(listOf(1, 2), afterDelete.items.map { it.index })
    }

    @Test
    fun `删除后拼接结果反映最新顺序`() {
        val session = sessionOf("AAA", "BBB", "CCC")

        val afterDelete = session.delete(session.items[1].id)

        assertEquals("AAACCC", afterDelete.join(JoinStrategy.Direct))
    }

    @Test
    fun `删除不存在的 id 时原样返回`() {
        val session = sessionOf("AAA")

        assertSame(session, session.delete("不存在的-id"))
    }

    @Test
    fun `相同内容被扫描两次时 id 仍然唯一`() {
        // 用户可能故意重扫同一张码（例如确认内容），此时两条记录必须能共存，
        // 否则列表的 key 会冲突、删除也会误删。
        val session = sessionOf("AAA", "AAA")

        assertEquals(2, session.count)
        assertEquals(2, session.items.map { it.id }.distinct().size)
    }

    @Test
    fun `空会话拼接为空字符串`() {
        val session = ScanSession()

        assertTrue(session.isEmpty)
        assertEquals("", session.join(JoinStrategy.Direct))
    }

    @Test
    fun `按 id 查找`() {
        val session = sessionOf("AAA", "BBB")
        val first = session.items.first()

        assertEquals("AAA", session.find(first.id)?.content)
        assertNull(session.find("不存在"))
    }
}
