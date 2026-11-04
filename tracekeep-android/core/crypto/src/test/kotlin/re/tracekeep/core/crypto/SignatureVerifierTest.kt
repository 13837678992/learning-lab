package re.tracekeep.core.crypto

import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import re.tracekeep.core.model.SignatureAlgorithm
import re.tracekeep.core.model.SignatureRecord

/**
 * 签名与规范编码测试（阶段 7 验收：错误公钥/错误签名/载荷篡改必须准确分项）。
 * 使用 **JVM 本地生成的 EC 密钥模拟** Keystore 行为；Android Keystore 硬件路径待真机验证。
 */
class SignatureVerifierTest {

    private fun ecKeyPair(): KeyPair {
        val kpg = KeyPairGenerator.getInstance("EC")
        kpg.initialize(ECGenParameterSpec("secp256r1"))
        return kpg.generateKeyPair()
    }

    private fun sign(priv: java.security.PrivateKey, payload: ByteArray): String {
        val sig = Signature.getInstance("SHA256withECDSA")
        sig.initSign(priv)
        sig.update(payload)
        return Base64.getEncoder().encodeToString(sig.sign())
    }

    private fun payload(chainHead: String = "H", events: Int = 3, files: Map<String, String> = mapOf("a.mp4" to "aa")) =
        SealCanonicalEncoder.SigningPayload(
            chainHeadHash = chainHead,
            eventsCount = events,
            files = files,
            appVersionName = "0.1.4",
            algorithm = SignatureAlgorithm.ECDSA_P256_SHA256,
            keyId = "EC-P256-TEST",
        )

    private fun record(kp: KeyPair, p: SealCanonicalEncoder.SigningPayload): SignatureRecord {
        val bytes = SealCanonicalEncoder.encode(p)
        val digest = re.tracekeep.core.integrity.Sha256.of(bytes)
        return SignatureRecord(
            objectType = SealCanonicalEncoder.SEAL_OBJECT_TYPE,
            objectVersion = SealCanonicalEncoder.SEAL_OBJECT_VERSION,
            algorithm = SignatureAlgorithm.ECDSA_P256_SHA256,
            keyId = "EC-P256-TEST",
            signedPayloadSha256 = digest,
            signatureBase64 = sign(kp.private, bytes),
            signedAtWallMs = 1_700_000_000_000,
            signedPayload = p.toJson(),
        )
    }

    // ------------------------------------------------------------ 规范编码

    @Test
    fun sealEncoding_isDeterministic_andFileOrderIndependent() {
        val a = payload(files = mapOf("a.mp4" to "aa", "b.mp4" to "bb"))
        val b = payload(files = mapOf("b.mp4" to "bb", "a.mp4" to "aa"))
        assertTrue(SealCanonicalEncoder.encode(a).contentEquals(SealCanonicalEncoder.encode(b)))
    }

    // ------------------------------------------------------------ 正常验证

    @Test
    fun validSignature_verifies() {
        val kp = ecKeyPair()
        val p = payload()
        val rec = record(kp, p)
        val pub = Base64.getEncoder().encodeToString(kp.public.encoded)
        assertEquals(SignatureVerifier.Result.Valid, SignatureVerifier.verify(rec, pub))
    }

    // ------------------------------------------------------------ 破坏性分项

    @Test
    fun wrongPublicKey_reportsInvalidSignature() {
        val kp = ecKeyPair()
        val other = ecKeyPair()
        val rec = record(kp, payload())
        val wrongPub = Base64.getEncoder().encodeToString(other.public.encoded)
        val result = SignatureVerifier.verify(rec, wrongPub)
        assertTrue("期望 InvalidSignature，实际 $result", result is SignatureVerifier.Result.InvalidSignature)
    }

    @Test
    fun tamperedPayload_reportsDigestMismatch() {
        val kp = ecKeyPair()
        val rec = record(kp, payload(chainHead = "H"))
        // 篡改 signedPayload 内容（链头改为 H2），摘要字段保持旧值
        val tampered = rec.copy(
            signedPayload = payload(chainHead = "H2").toJson(),
        )
        val pub = Base64.getEncoder().encodeToString(kp.public.encoded)
        val result = SignatureVerifier.verify(tampered, pub)
        assertTrue("期望 PayloadDigestMismatch，实际 $result", result is SignatureVerifier.Result.PayloadDigestMismatch)
    }

    @Test
    fun corruptedSignatureValue_reportsInvalidSignature() {
        val kp = ecKeyPair()
        val rec = record(kp, payload())
        // 破坏签名值（保持长度合法但内容错误）
        val badSig = Base64.getEncoder().encodeToString(ByteArray(64) { 0x01 })
        val pub = Base64.getEncoder().encodeToString(kp.public.encoded)
        val result = SignatureVerifier.verify(rec.copy(signatureBase64 = badSig), pub)
        assertTrue("期望 InvalidSignature，实际 $result", result is SignatureVerifier.Result.InvalidSignature)
    }

    @Test
    fun malformedPublicKey_reportsInvalidPublicKey() {
        val rec = record(ecKeyPair(), payload())
        val result = SignatureVerifier.verify(rec, "not-base64-der!!!")
        assertTrue("期望 InvalidPublicKey，实际 $result", result is SignatureVerifier.Result.InvalidPublicKey)
    }

    @Test
    fun differentPayloads_produceDifferentDigests() {
        val kp = ecKeyPair()
        val r1 = record(kp, payload(chainHead = "H1"))
        val r2 = record(kp, payload(chainHead = "H2"))
        assertNotEquals(r1.signedPayloadSha256, r2.signedPayloadSha256)
    }
}
