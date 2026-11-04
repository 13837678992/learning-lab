package re.tracekeep.core.model

/**
 * 文件生命周期（与校验结果 [VerificationStatus] 分开表达）。
 * REGISTERED：已登记、正在写入或写入结束但尚未计算最终哈希（不得对外宣称完整）；
 * FINALIZED：封装完成并已记录 SHA-256 与大小；
 * INCOMPLETE：异常中断/封装失败，明确标记为未完成（不得标记为完整封存）。
 */
enum class FileLifecycle {
    REGISTERED,
    FINALIZED,
    INCOMPLETE,
}
