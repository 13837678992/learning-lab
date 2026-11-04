package re.tracekeep.core.provider

/**
 * 第三方电子数据存证能力接口（需求 §7；阶段 8）。
 *
 * **能力边界（不得夸大）**：
 * - 存证至多支持「某摘要/清单在某时间点已被该服务受理并存留」；
 * - 若仅提交哈希/清单：只能证明服务商收到该摘要，**不能**证明摘要对应的现场事实真实，
 *   也**不能**证明提交前数据的形成过程；
 * - 平台是否保存原始媒体、是否支持独立验证、停业后如何验证，属阶段 0 尽调范围（未完成）。
 *
 * **实现纪律（D-003）**：未核实服务主体/条款/接口/价格前，不实现具体适配器；
 * 首版仅提供 [NoOpEvidencePreservationProvider]（如实报告"未存证"）。
 */
interface EvidencePreservationProvider {

    val providerId: String

    /** 提交内容范围（决定隐私暴露面；提交前必须向用户明示）。 */
    fun submissionScope(): SubmissionScope

    fun availability(): PreservationAvailability

    /**
     * 提交存证。契约：
     * - 保存请求摘要、服务响应、服务商标识、请求/响应时间、凭证原文、签名与验证材料；
     * - 网络失败/超时：返回 [PreservationResult.Failed]，调用方标注"未存证"，不得伪造回执；
     * - **默认最小化**：优先仅提交哈希/清单；提交完整媒体必须经用户逐次明确确认。
     */
    fun submit(request: PreservationRequest): PreservationResult
}

/** 提交内容范围（隐私影响分级）。 */
sealed interface SubmissionScope {
    /** 仅摘要（默认、最小暴露）。 */
    data class DigestOnly(val digestSha256: String) : SubmissionScope

    /** 清单（含文件名/大小/哈希，**不含媒体内容**）。 */
    data class ManifestOnly(val manifestSha256: String) : SubmissionScope

    /** 完整媒体（最大暴露；需用户逐次明确确认）。 */
    data class FullMedia(val fileCount: Int, val totalBytes: Long) : SubmissionScope
}

sealed interface PreservationAvailability {
    data object NotConfigured : PreservationAvailability
    data class Configured(val providerId: String, val requiresUserConfirmation: Boolean) : PreservationAvailability
    data class Unavailable(val providerId: String, val reason: String) : PreservationAvailability
}

data class PreservationRequest(
    val scope: SubmissionScope,
    /** 被提交内容的摘要（供服务商回执关联）。 */
    val digestSha256: String,
)

sealed interface PreservationResult {
    data class Success(
        val providerId: String,
        val requestedAtWallMs: Long,
        val respondedAtWallMs: Long,
        val receiptRaw: ByteArray,
        val verifyMaterial: Map<String, String>,
    ) : PreservationResult {
        override fun equals(other: Any?): Boolean = this === other
        override fun hashCode(): Int = System.identityHashCode(this)
    }

    data class Failed(val providerId: String, val reason: String) : PreservationResult
    data class NotAttempted(val reason: String) : PreservationResult
}

/** 默认实现：如实表示"未配置第三方存证服务"（首版行为）。 */
object NoOpEvidencePreservationProvider : EvidencePreservationProvider {
    override val providerId: String = "none"
    override fun submissionScope(): SubmissionScope = SubmissionScope.DigestOnly("")
    override fun availability(): PreservationAvailability = PreservationAvailability.NotConfigured
    override fun submit(request: PreservationRequest): PreservationResult =
        PreservationResult.NotAttempted("no evidence preservation provider configured")
}
