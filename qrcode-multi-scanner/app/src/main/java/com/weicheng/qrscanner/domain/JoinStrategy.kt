package com.weicheng.qrscanner.domain

/**
 * 多张内容的拼接方式。
 *
 * 第一阶段只需要「直接拼接」，但把拼接抽成策略是为了给第二阶段留出扩展点：
 * 新增换行拼接或自定义分隔符时，只需增加一个实现，界面和数据结构都不用改。
 *
 * 抽成 `fun interface` 的好处是可以直接用 lambda 表达，避免为一种拼接方式
 * 单独写一个类。
 */
fun interface JoinStrategy {
    fun join(parts: List<String>): String

    companion object {
        /**
         * MVP 默认策略：直接拼接，不插入任何分隔符。
         *
         * 例：["Hello", "World"] -> "HelloWorld"
         */
        val Direct: JoinStrategy = JoinStrategy { parts -> parts.joinToString(separator = "") }

        /**
         * 预留：按指定分隔符拼接（换行拼接即 separator = "\n"）。
         * 第一阶段未接入界面，仅作为扩展点保留。
         */
        fun separated(separator: String): JoinStrategy =
            JoinStrategy { parts -> parts.joinToString(separator = separator) }
    }
}
