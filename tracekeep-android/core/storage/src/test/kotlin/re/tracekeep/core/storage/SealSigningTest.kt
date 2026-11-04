package re.tracekeep.core.storage

import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import re.tracekeep.core.crypto.SignatureEngine
import re.tracekeep.core.crypto.SignatureVerifier
import re.tracekeep.core.model.FileRole
import re.tracekeep.core.model.KeyDescriptor
import re.tracekeep.core.model.KeyProtectionLevel
import re.tracekeep.core.model.RecordingType
import re.tracekeep.core.model.SessionState
import re.tracekeep.core.model.SignatureAlgorithm
import re.tracekeep.core.model.VerificationStatus

/**
 * 封存签名集成测试（阶段 7）。使用**纯 JVM 测试签名引擎**（EC P-256，模拟 Keystore 语义）；
 * Android Keystore 真实实现待真机验证。
 */
class SealSigningTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    /** 测试签名引擎：JVM 本地 EC 密钥；私钥仅存在于本对象内（不落盘、不导出）。 */
    private class JvmTestSigningEngine : SignatureEngine {
        private val kp: KeyPair = KeyPairGenerator.getInstance("EC").apply {
            initialize(ECGenParameterSpec("secp256r1"))
        }.generateKeyPair()
        private val descriptor = KeyDescriptor(
            keyId = "TEST-EC-1",
            algorithm = SignatureAlgorithm.ECDSA_P256_SHA256,
            protectionLevel = KeyProtectionLevel.EXTERNAL,
            publicKeyBase64 = Base64.getEncoder().encodeToString(kp.public.encoded),
            createdAtWallMs = 1, validFromWallMs = 1, appVersionName = "test",
        )
        var failSigning = false

        override fun getOrCreateActiveKey(appVersionName: String?): KeyDescriptor = descriptor
        override fun listKeys(): List<KeyDescriptor> = listOf(descriptor)
        override fun sign(keyId: String, payloadBytes: ByteArray, algorithm: SignatureAlgorithm): String {
            if (failSigning) throw re.tracekeep.core.crypto.SigningException("simulated key loss")
            val sig = Signature.getInstance("SHA256withECDSA")
            sig.initSign(kp.private); sig.update(payloadBytes)
            return Base64.getEncoder().encodeToString(sig.sign())
        }
        fun publicKeyBase64() = descriptor.publicKeyBase64
    }

    private lateinit var store: EvidenceStore
    private lateinit var root: java.nio.file.Path

    @Before
    fun setUp() {
        root = tempFolder.newFolder("root").toPath()
        store = EvidenceStore(root)
    }

    private fun makeStoppedSession(): Pair<String, String> {
        val session = store.createSession(RecordingType.AUDIO)
        store.transition(session.sessionId, SessionState.RECORDING)
        val file = store.registerFile(session.sessionId, FileRole.ORIGINAL, "a.m4a")
        java.nio.file.Files.write(file.absolutePath, "content".toByteArray())
        store.finalizeFile(session.sessionId, file.fileId)
        store.transition(session.sessionId, SessionState.STOPPED)
        return session.sessionId to file.fileId
    }

    @Test
    fun sealSigned_writesVerifiableSignature() {
        val (sessionId, _) = makeStoppedSession()
        val engine = JvmTestSigningEngine()
        val result = store.sealSigned(sessionId, engine, appVersionName = "0.1.4")
        assertTrue(result.record.eventsCount > 0)

        val rec = store.loadSignatureRecord(sessionId)
        assertNotNull("应写入签名记录", rec)
        assertEquals("TEST-EC-1", rec!!.keyId)
        // 独立验证器可验证（纯 JVM，不依赖 App）
        assertEquals(
            SignatureVerifier.Result.Valid,
            SignatureVerifier.verify(rec, engine.publicKeyBase64()),
        )
    }

    @Test
    fun sealSigned_signatureCoversChainHead() {
        val (sessionId, _) = makeStoppedSession()
        val engine = JvmTestSigningEngine()
        store.sealSigned(sessionId, engine)
        val rec = store.loadSignatureRecord(sessionId)!!
        // 签名载荷的链头哈希应等于会话末条入链事件的 hash
        val chainHead = store.readEvents(sessionId).events.last { it.hash != null }.hash!!
        assertEquals(chainHead, rec.signedPayload["chainHeadHash"]?.toString()?.trim('"'))
    }

    @Test
    fun unsignedSession_hasNoSignatureRecord() {
        val (sessionId, _) = makeStoppedSession()
        store.seal(sessionId) // 不签名
        assertNull(store.loadSignatureRecord(sessionId))
    }

    @Test(expected = re.tracekeep.core.crypto.SigningException::class)
    fun signingFailure_propagates_doesNotMarkSigned() {
        val (sessionId, _) = makeStoppedSession()
        val engine = JvmTestSigningEngine().apply { failSigning = true }
        try {
            store.sealSigned(sessionId, engine)
        } finally {
            // 签名失败时**不得**留下签名记录（不得伪造成功）
            assertNull("签名失败不得留下签名记录", store.loadSignatureRecord(sessionId))
        }
    }

    @Test
    fun signatureRecord_containsNoPrivateKey() {
        val (sessionId, _) = makeStoppedSession()
        val engine = JvmTestSigningEngine()
        store.sealSigned(sessionId, engine)
        val raw = java.nio.file.Files.readString(
            root.resolve("sessions/$sessionId/signatures.json"),
        )
        // 私钥绝不会出现在签名记录中（公钥、签名值、载荷是可公开材料）
        assertTrue("签名记录不应包含 PRIVATE 关键字", !raw.contains("PRIVATE", ignoreCase = true))
    }

    @Test
    fun sealStillVerifiable_afterSigning() {
        val (sessionId, fileId) = makeStoppedSession()
        val engine = JvmTestSigningEngine()
        store.sealSigned(sessionId, engine)
        assertEquals(VerificationStatus.PASS, store.verifyFile(sessionId, fileId))
        assertTrue(store.verifySeal(sessionId).allMatch)
    }
}
