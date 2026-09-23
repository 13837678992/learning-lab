package com.weicheng.qrscanner.model

import com.weicheng.qrscanner.domain.JoinStrategy

/**
 * 一次「多张合并」扫描任务。
 *
 * 关键约束：每张二维码必须独立保存，绝不边扫边拼接成一个大字符串。
 * 拼接只发生在用户点击「完成」之后，由 [join] 按当前列表顺序计算得出。
 * 这样删除、重排、校验缺失才有可能实现。
 *
 * 本类为纯 Kotlin（不含任何 android.* 依赖），可直接用 JVM 单元测试覆盖。
 *
 * @param items 按扫描顺序保存的条目，列表顺序即最终拼接顺序。
 * @param nextSeq 单调递增的序号，仅用于生成稳定且不重复的条目 id。
 */
data class ScanSession(
    val items: List<ScanItem> = emptyList(),
    val nextSeq: Int = 1,
) {
    val count: Int get() = items.size

    val isEmpty: Boolean get() = items.isEmpty()

    /** 追加一张扫描结果，返回新的会话（不可变更新）。 */
    fun append(content: String): ScanSession {
        val item = ScanItem(
            id = "item-$nextSeq",
            index = items.size + 1,
            content = content,
        )
        return copy(items = items + item, nextSeq = nextSeq + 1)
    }

    /**
     * 删除指定条目。
     *
     * 删除后剩余条目会重新编号，使 [ScanItem.index] 继续等于列表位置，
     * 从而保证「界面显示的序号」与「最终拼接顺序」永远一致。
     */
    fun delete(itemId: String): ScanSession {
        val remaining = items.filterNot { it.id == itemId }
        if (remaining.size == items.size) return this
        return copy(items = remaining.mapIndexed { position, item -> item.copy(index = position + 1) })
    }

    fun find(itemId: String): ScanItem? = items.firstOrNull { it.id == itemId }

    /** 按给定策略拼接全部内容。 */
    fun join(strategy: JoinStrategy): String = strategy.join(items.map { it.content })
}
