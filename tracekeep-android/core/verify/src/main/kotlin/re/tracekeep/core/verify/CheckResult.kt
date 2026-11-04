package re.tracekeep.core.verify

/**
 * 验证项结果等级（需求 §6：输出 PASS/FAIL/WARN/SKIPPED，逐项解释原因）。
 *
 * 语义纪律：
 * - [PASS] 仅表示"该项检查通过"，**不代表证据内容真实或整体可信**；
 * - [WARN] 表示"存在无法充分判定的情况"（如历史事件未入链）——必须说明原因；
 * - [SKIPPED] 表示"因缺少材料/能力未执行"（如包内无公钥）——不得当作通过；
 * - 单项通过不得提升其他项的状态（不做"整体可信"的结论）。
 */
enum class CheckStatus { PASS, FAIL, WARN, SKIPPED }

/** 单项验证结果（机器可读 + 人类可读原因）。 */
data class CheckResult(
    /** 稳定检查项标识（供工具/报告引用，不随文案变化）。 */
    val id: String,
    val title: String,
    val status: CheckStatus,
    val detail: String = "",
)

/** 验证会话的总体结果：逐项结果 + 便于概览的计数（**不给出"整体可信"布尔值**）。 */
data class VerificationReport(
    val results: List<CheckResult>,
) {
    val passCount: Int get() = results.count { it.status == CheckStatus.PASS }
    val failCount: Int get() = results.count { it.status == CheckStatus.FAIL }
    val warnCount: Int get() = results.count { it.status == CheckStatus.WARN }
    val skippedCount: Int get() = results.count { it.status == CheckStatus.SKIPPED }

    /** 是否存在任何 FAIL（供调用方判断"是否有明确失败项"；不代表"其余项可信"）。 */
    val hasFailure: Boolean get() = failCount > 0
}
