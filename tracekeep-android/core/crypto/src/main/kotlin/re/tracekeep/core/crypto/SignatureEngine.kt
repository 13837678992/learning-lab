package re.tracekeep.core.crypto

import re.tracekeep.core.model.KeyDescriptor
import re.tracekeep.core.model.SignatureAlgorithm
import re.tracekeep.core.model.SignatureRecord

/**
 * 签名引擎接口（私钥操作与平台解耦）。
 *
 * 设计意图（需求 §5、§6；阶段 10 独立验证）：
 * - **签名（用私钥）**：Android 层实现（Android Keystore），私钥永不离开 Keystore、永不导出；
 * - **验证（用公钥）**：纯 JVM 实现（[SignatureVerifier]），独立验证器无需 Android 运行时；
 * - 本接口只负责产生/管理签名所需的密钥与签名值，不承担验证职责。
 */
interface SignatureEngine {

    /**
     * 取得（或首次生成）当前活动密钥。实现必须：
     * - 私钥不可导出；[KeyDescriptor] 仅含公钥与元数据；
     * - 如实报告 [KeyDescriptor.protectionLevel]（硬件/软件），不得夸大；
     * - 密钥生成失败时抛出异常（由调用方如实处理，不得伪造成功）。
     */
    fun getOrCreateActiveKey(appVersionName: String?): KeyDescriptor

    /** 使用指定 [keyId] 的私钥对 [payloadBytes] 签名，返回 Base64 签名值。 */
    fun sign(keyId: String, payloadBytes: ByteArray, algorithm: SignatureAlgorithm): String

    /** 列出所有已知密钥（含已轮换/停用的历史密钥，供验证历史签名）。 */
    fun listKeys(): List<KeyDescriptor>
}

/** 签名过程中的异常（调用方不得将其吞掉后标记成功）。 */
class SigningException(message: String, cause: Throwable? = null) : Exception(message, cause)

/** 验证过程中的异常（如公钥格式非法）。 */
class VerificationException(message: String, cause: Throwable? = null) : Exception(message, cause)
