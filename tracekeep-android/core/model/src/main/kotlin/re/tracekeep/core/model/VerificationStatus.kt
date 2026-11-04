package re.tracekeep.core.model

/**
 * 校验状态（需求 §5：区分通过、失败、缺失、未完成和无法读取）。
 * 该枚举描述的是「对某个文件当下重新校验」的结果，不写入文件生命周期字段。
 */
enum class VerificationStatus {
    /** 重新计算的 SHA-256 与登记值一致。 */
    PASS,

    /** 文件存在且可读，但重新计算的 SHA-256 与登记值不一致（内容可能已变化）。 */
    FAIL,

    /** 文件不存在于应有位置。 */
    MISSING,

    /** 文件从未完成封装（生命周期仍为 REGISTERED），无登记哈希可比对。 */
    UNFINISHED,

    /** 文件存在但无法读取（IO 错误、被占用、路径被替换为目录等）。 */
    UNREADABLE,
}
