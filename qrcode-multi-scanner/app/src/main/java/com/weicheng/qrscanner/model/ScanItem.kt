package com.weicheng.qrscanner.model

/**
 * 多张扫描任务中的单张二维码结果。
 *
 * [content] 是二维码的原始 rawValue，逐字保存：不 trim、不换行、不拼接。
 * 这一点是整个「多张合并」正确性的前提，任何处理都必须发生在拼接阶段，
 * 而不是保存阶段。
 *
 * [index] 恒等于该条目在当前列表中的位置（从 1 开始），也就是最终拼接顺序。
 * 删除条目后会在 [ScanSession.delete] 中重新编号，保证 index 与顺序始终一致。
 *
 * [partIndex] / [totalParts] 为分片协议预留字段（对应形如 `[1/5]xxx` 的二维码，
 * 以及 Electron 版发送端的 `index` / `total` 字段）。
 * 第一阶段不解析，恒为 null。
 */
data class ScanItem(
    val id: String,
    val index: Int,
    val content: String,
    val partIndex: Int? = null,
    val totalParts: Int? = null,
) {
    /** 内容长度，供日志与界面显示使用（日志只允许记录长度，不记录内容）。 */
    val contentLength: Int get() = content.length
}
