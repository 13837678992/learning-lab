package re.tracekeep.core.timestamp

/**
 * 第三方时间证明（可信时间戳）能力接口（需求 §7；阶段 8）。
 *
 * **能力边界（写入界面/报告时必须一致，不得夸大）**：
 * - 可信时间戳至多支持「某摘要对应的数据在**该时间点**已被该服务受理」；
 * - 它**不能**证明数据在形成之初就是真实的，也**不能**证明摘要对应的现场事实真实；
 * - 它不是法院采信的保证；能否采信由个案与有权机关依法审查。
 *
 * **实现纪律（D-003 / 需求 §1、§10 阶段 8）**：
 * - 在完成官方资料核实（服务主体、条款、接口、价格、数据上传范围）并经用户选定供应商之前，
 *   **不得**实现任何具体供应商适配器、不得硬编码 API、不得虚构回执；
 * - 首版仅提供 [NoOpTimestampProvider]（如实报告"未启用"）；
 * - 付费服务不得成为应用运行前提（[TimestampAvailability] 区分"未配置/付费未启用"）。
 */
interface TimestampProvider {

    /** 服务商标识（用于报告与凭证溯源；未启用实现返回固定占位）。 */
    val providerId: String

    /** 可用性（不发起网络请求的静态判定）。 */
    fun availability(): TimestampAvailability

    /**
     * 对 [digestSha256]（被存证对象的 SHA-256，小写 hex）请求时间戳。
     * 契约：
     * - 必须保存**原始响应、服务商签名、证书链/验证材料、请求摘要、请求/响应时间**；
     * - 网络失败/服务超时：返回 [TimestampResult.Failed]，调用方标注"未存证"，
     *   **不得伪造成功回执**；
     * - 优先仅提交摘要（最小化隐私暴露），不提交完整媒体（除服务条款另有约定并经用户确认）。
     */
    fun requestTimestamp(digestSha256: String): TimestampResult
}

/** 可用性（区分"未配置服务商"与"已配置但当前不可用"，供 UI/报告如实显示）。 */
sealed interface TimestampAvailability {
    /** 未配置服务商（本版本默认；报告显示"本次记录没有第三方时间戳"）。 */
    data object NotConfigured : TimestampAvailability

    /** 已配置服务商（需用户确认费用/上传范围后才可提交）。 */
    data class Configured(val providerId: String, val requiresUserConfirmation: Boolean) : TimestampAvailability

    /** 已配置但当前不可用（网络/服务端）。 */
    data class Unavailable(val providerId: String, val reason: String) : TimestampAvailability
}

/** 时间戳请求结果。 */
sealed interface TimestampResult {
    /**
     * 成功：保留服务商返回的全部验证材料（不解析成自定义结构以免丢失可复核信息）。
     * [receiptRaw] 为原始响应字节（凭证原文）；[verifyMaterial] 为验证所需材料（证书链/公钥等）。
     */
    data class Success(
        val providerId: String,
        val requestedAtWallMs: Long,
        val respondedAtWallMs: Long,
        val requestDigestSha256: String,
        val receiptRaw: ByteArray,
        val verifyMaterial: Map<String, String>,
        val providerTimestampWallMs: Long?,
    ) : TimestampResult {
        override fun equals(other: Any?): Boolean = this === other
        override fun hashCode(): Int = System.identityHashCode(this)
    }

    /** 失败：未获得时间戳；调用方必须标注"未存证"（不得伪造成功）。 */
    data class Failed(val providerId: String, val reason: String) : TimestampResult

    /** 未启用（未配置服务商）——与"失败"区分：这表示**从未尝试**。 */
    data class NotAttempted(val reason: String) : TimestampResult
}

/** 默认实现：如实表示"未配置第三方时间戳服务"（首版行为）。 */
object NoOpTimestampProvider : TimestampProvider {
    override val providerId: String = "none"
    override fun availability(): TimestampAvailability = TimestampAvailability.NotConfigured
    override fun requestTimestamp(digestSha256: String): TimestampResult =
        TimestampResult.NotAttempted("no timestamp provider configured")
}
