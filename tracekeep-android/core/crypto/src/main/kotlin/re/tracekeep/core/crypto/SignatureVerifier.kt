package re.tracekeep.core.crypto

import java.security.KeyFactory
import java.security.PublicKey
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64
import re.tracekeep.core.model.SignatureAlgorithm
import re.tracekeep.core.model.SignatureRecord

/**
 * 签名验证器（纯 JVM；需求 §5、§6；阶段 10 独立验证器直接复用）。
 *
 * 只依赖 `java.security` 与证据包内材料（公钥 + 签名 + 载荷）：
 * - **不依赖 Android 运行时**；
 * - **不依赖原 App 数据库、运行状态或私钥**。
 *
 * 验证分项（逐项返回，不得笼统"验证失败"）：
 * 1. 算法是否受支持；
 * 2. 公钥是否可解析；
 * 3. 载荷规范编码后摘要是否与 [SignatureRecord.signedPayloadSha256] 一致（内容未变）；
 * 4. 签名值是否可被该公钥验证通过。
 */
object SignatureVerifier {

    /** 单次验证结果。 */
    sealed interface Result {
        data object Valid : Result

        /** 算法不受支持（版本/兼容问题，需明确报告）。 */
        data class UnsupportedAlgorithm(val algorithm: SignatureAlgorithm) : Result

        /** 公钥无法解析（材料损坏或格式不符）。 */
        data class InvalidPublicKey(val reason: String) : Result

        /** 载荷摘要与记录不符（内容被改动）。 */
        data class PayloadDigestMismatch(val expected: String, val actual: String) : Result

        /** 签名无效（用错误公钥、错误签名值或被篡改内容均落在此）。 */
        data class InvalidSignature(val reason: String) : Result
    }

    private val SUPPORTED = setOf(
        SignatureAlgorithm.ECDSA_P256_SHA256,
        SignatureAlgorithm.RSA_PKCS1_SHA256,
    )

    private fun jcaSignatureAlgorithm(algorithm: SignatureAlgorithm): String = when (algorithm) {
        SignatureAlgorithm.ECDSA_P256_SHA256 -> "SHA256withECDSA"
        SignatureAlgorithm.RSA_PKCS1_SHA256 -> "SHA256withRSA"
    }

    private fun keyFactoryAlgorithm(algorithm: SignatureAlgorithm): String = when (algorithm) {
        SignatureAlgorithm.ECDSA_P256_SHA256 -> "EC"
        SignatureAlgorithm.RSA_PKCS1_SHA256 -> "RSA"
    }

    /**
     * 验证签名记录。
     * @param record 被测签名记录（含 signedPayload 原文、摘要、签名、算法）
     * @param publicKeyBase64 对应 [record.keyId] 的公钥（X.509 SPKI, Base64）
     */
    fun verify(record: SignatureRecord, publicKeyBase64: String): Result {
        if (record.algorithm !in SUPPORTED) return Result.UnsupportedAlgorithm(record.algorithm)

        val publicKey: PublicKey = try {
            parsePublicKey(publicKeyBase64, record.algorithm)
        } catch (e: Exception) {
            return Result.InvalidPublicKey(e.message ?: e::class.simpleName.orEmpty())
        }

        // 内容摘要核对：signedPayload 的规范编码摘要须与记录一致
        val payloadBytes = SealCanonicalEncoder.encodeJson(record.signedPayload)
        val actualDigest = re.tracekeep.core.integrity.Sha256.of(payloadBytes)
        if (actualDigest != record.signedPayloadSha256) {
            return Result.PayloadDigestMismatch(record.signedPayloadSha256, actualDigest)
        }

        // 签名核对
        return try {
            val sig = Signature.getInstance(jcaSignatureAlgorithm(record.algorithm))
            sig.initVerify(publicKey)
            sig.update(payloadBytes)
            val signatureBytes = Base64.getDecoder().decode(record.signatureBase64)
            if (sig.verify(signatureBytes)) Result.Valid else Result.InvalidSignature("signature does not verify")
        } catch (e: Exception) {
            Result.InvalidSignature(e.message ?: e::class.simpleName.orEmpty())
        }
    }

    /** 解析 X.509 SPKI 公钥（Base64）。 */
    fun parsePublicKey(publicKeyBase64: String, algorithm: SignatureAlgorithm): PublicKey {
        val der = Base64.getDecoder().decode(publicKeyBase64)
        val spec = X509EncodedKeySpec(der)
        return KeyFactory.getInstance(keyFactoryAlgorithm(algorithm)).generatePublic(spec)
    }
}
