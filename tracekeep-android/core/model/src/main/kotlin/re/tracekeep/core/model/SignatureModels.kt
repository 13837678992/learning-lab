package re.tracekeep.core.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/**
 * 签名算法标识（签名对象与验证材料的一部分；独立验证器据此选择验证算法）。
 * 只列出本项目实际使用的算法；新增必须显式加入并记录于文档。
 */
enum class SignatureAlgorithm {
    /** ECDSA over P-256 (secp256r1) with SHA-256。 */
    ECDSA_P256_SHA256,

    /** RSASSA-PKCS1-v1_5 with SHA-256（备用；部分设备/历史密钥）。 */
    RSA_PKCS1_SHA256,
}

/**
 * 密钥来源与保护级别（**如实标注，不得夸大**；需求 §5、威胁模型 K 域）。
 */
enum class KeyProtectionLevel {
    /** Android Keystore 报告密钥位于硬件安全模块（TEE/StrongBox）。 */
    HARDWARE_BACKED,

    /** 密钥由 Android Keystore 管理但由软件实现（**不是**硬件保护）。 */
    SOFTWARE_BACKED,

    /** 非 Android 环境（如纯 JVM 测试/桌面验证器）使用的密钥。 */
    EXTERNAL,
}

/**
 * 密钥描述（公钥与元数据；**私钥永不进入本结构，也永不导出**）。
 *
 * 生命周期规则（需求 §5）：
 * - [keyId] 为该密钥的稳定标识（SHA-256 公钥指纹短形式），轮换后新密钥用新 keyId，
 *   历史签名仍用其记录的旧 keyId 验证；
 * - [validFromWallMs]/[retiredAtWallMs] 记录启用与停用（轮换）时间；
 * - 密钥丢失：旧签名仍可验证（公钥在包内），但无法再产生该 keyId 的新签名——
 *   **禁止**用新密钥冒充旧密钥重签。
 */
@Serializable
data class KeyDescriptor(
    val keyId: String,
    val algorithm: SignatureAlgorithm,
    val protectionLevel: KeyProtectionLevel,
    /** 公钥编码（Base64；X.509 SubjectPublicKeyInfo）。 */
    val publicKeyBase64: String,
    val createdAtWallMs: Long,
    val validFromWallMs: Long,
    val retiredAtWallMs: Long? = null,
    /** 是否使用用户认证（生物/锁屏）保护私钥（当前实现为 false，如实记录）。 */
    val userAuthenticationRequired: Boolean = false,
    /** 生成该密钥的应用版本（用于追溯）。 */
    val appVersionName: String? = null,
)

/**
 * 签名记录（evidence 包内 signatures/ 的持久化结构；独立验证的输入）。
 *
 * 签名覆盖对象由 [signedPayloadSha256] 摘要标识（payload 的规范编码见
 * `core:integrity` 的 CanonicalEncoding 与 `core:crypto` 的 SealCanonicalEncoder）——
 * 验证器重算摘要并核验签名，从而确认"该摘要对应的确切内容"由该密钥签署。
 */
@Serializable
data class SignatureRecord(
    val formatVersion: Int = EvidenceFormat.VERSION,
    /** 签名对象类型（如 "seal"）；版本化以支持将来扩展签名对象。 */
    val objectType: String,
    val objectVersion: Int,
    val algorithm: SignatureAlgorithm,
    val keyId: String,
    /** 被签内容的 SHA-256（hex）；验证器据此比对内容是否变化。 */
    val signedPayloadSha256: String,
    /** 签名值（Base64）。 */
    val signatureBase64: String,
    val signedAtWallMs: Long,
    /** 被签署的规范载荷原文（JSON；供复核；**不含私钥**）。 */
    val signedPayload: JsonObject,
)
