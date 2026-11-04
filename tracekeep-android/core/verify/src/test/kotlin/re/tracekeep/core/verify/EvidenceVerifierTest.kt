package re.tracekeep.core.verify

import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import re.tracekeep.core.crypto.SealCanonicalEncoder
import re.tracekeep.core.integrity.HashChain
import re.tracekeep.core.integrity.Sha256
import re.tracekeep.core.model.EventSource
import re.tracekeep.core.model.EvidenceEvent
import re.tracekeep.core.model.EvidenceFile
import re.tracekeep.core.model.EvidenceFormat
import re.tracekeep.core.model.FileLifecycle
import re.tracekeep.core.model.FileRole
import re.tracekeep.core.model.SignatureAlgorithm
import re.tracekeep.core.model.SignatureRecord

/**
 * 证据验证器测试（阶段 7 验收§4.6 的 12 项安全场景中可在纯 JVM 验证的部分）。
 * 全部为合成材料；Android Keystore 硬件路径待真机验证。
 */
class EvidenceVerifierTest {

    private val verifier = EvidenceVerifier()

    // ---- 合成材料 ----

    private fun event(seq: Long, type: String, prevHash: String?) = EvidenceEvent(
        seq = seq, sessionId = "s1", wallMs = 1_000_000 + seq, monoMs = 500 + seq,
        type = type, source = EventSource.APP_OBSERVATION,
        payload = JsonObject(mapOf("n" to JsonPrimitive(seq))), prevHash = prevHash,
    )

    private fun chainedEvents(): List<EvidenceEvent> {
        val out = mutableListOf<EvidenceEvent>()
        var prev: String? = null
        listOf("session_created", "session_started", "session_stopped").forEachIndexed { i, t ->
            val e = HashChain.withHash(event(i + 1L, t, prev ?: HashChain.GENESIS_PREV_HASH))
            out += e; prev = e.hash
        }
        return out
    }

    private fun file(rel: String, bytes: ByteArray) = EvidenceFile(
        fileId = "f-$rel", sessionId = "s1", relativePath = rel, role = FileRole.ORIGINAL,
        lifecycle = FileLifecycle.FINALIZED, createdWallMs = 1, sizeBytes = bytes.size.toLong(),
        sha256 = Sha256.of(bytes), finalizedWallMs = 2,
    )

    private fun materials(
        files: List<EvidenceFile>,
        bytes: Map<String, ByteArray>,
        events: List<EvidenceEvent> = chainedEvents(),
        signature: SignatureRecord? = null,
        publicKeys: Map<String, String> = emptyMap(),
        skippedLines: Long = 0,
        formatVersion: Int = EvidenceFormat.VERSION,
        packageRoot: java.nio.file.Path? = null,
    ) = EvidenceVerifier.Materials(
        formatVersion = formatVersion,
        files = files,
        fileBytes = { rel -> bytes[rel] },
        events = events,
        skippedEventLines = skippedLines,
        signature = signature,
        publicKeys = publicKeys,
        supportedFormatVersion = EvidenceFormat.VERSION,
        packageRoot = packageRoot,
    )

    private fun ecKeyPair(): KeyPair {
        val kpg = KeyPairGenerator.getInstance("EC"); kpg.initialize(ECGenParameterSpec("secp256r1"))
        return kpg.generateKeyPair()
    }

    private fun signatureRecord(kp: KeyPair, chainHead: String, files: Map<String, String>): SignatureRecord {
        val p = SealCanonicalEncoder.SigningPayload(
            chainHeadHash = chainHead, eventsCount = 3, files = files,
            appVersionName = "test", algorithm = SignatureAlgorithm.ECDSA_P256_SHA256, keyId = "K1",
        )
        val bytes = SealCanonicalEncoder.encode(p)
        val sig = Signature.getInstance("SHA256withECDSA").apply {
            initSign(kp.private); update(bytes)
        }
        return SignatureRecord(
            objectType = SealCanonicalEncoder.SEAL_OBJECT_TYPE, objectVersion = SealCanonicalEncoder.SEAL_OBJECT_VERSION,
            algorithm = SignatureAlgorithm.ECDSA_P256_SHA256, keyId = "K1",
            signedPayloadSha256 = Sha256.of(bytes),
            signatureBase64 = Base64.getEncoder().encodeToString(sig.sign()),
            signedAtWallMs = 1, signedPayload = p.toJson(),
        )
    }

    private fun statusOf(report: VerificationReport, id: String) =
        report.results.single { it.id == id }.status

    // ------------------------------------------------------------ 1. 正常通过

    @Test
    fun scenario1_allValid_allPass() {
        val kp = ecKeyPair()
        val bytes = "media".toByteArray()
        val f = file("media/a.mp4", bytes)
        val chain = chainedEvents()
        val sig = signatureRecord(kp, chain.last().hash!!, mapOf("media/a.mp4" to f.sha256!!))
        val report = verifier.verify(
            materials(
                files = listOf(f), bytes = mapOf("media/a.mp4" to bytes),
                signature = sig, publicKeys = mapOf("K1" to Base64.getEncoder().encodeToString(kp.public.encoded)),
            ),
        )
        assertEquals(CheckStatus.PASS, statusOf(report, "format_version"))
        assertEquals(CheckStatus.PASS, statusOf(report, "file_integrity"))
        assertEquals(CheckStatus.PASS, statusOf(report, "hash_chain"))
        assertEquals(CheckStatus.PASS, statusOf(report, "signature"))
        assertFalse(report.hasFailure)
    }

    // ------------------------------------------------------------ 2. 改文件

    @Test
    fun scenario2_modifiedFile_failsFileIntegrity() {
        val bytes = "media".toByteArray()
        val f = file("media/a.mp4", bytes)
        val tampered = "mediA".toByteArray() // 改 1 字节
        val report = verifier.verify(materials(listOf(f), mapOf("media/a.mp4" to tampered)))
        assertEquals(CheckStatus.FAIL, statusOf(report, "file_integrity"))
    }

    // ------------------------------------------------------------ 3. 改元数据（链内容）

    @Test
    fun scenario3_modifiedEventContent_failsChain() {
        val events = chainedEvents().toMutableList()
        events[1] = events[1].copy(payload = JsonObject(mapOf("n" to JsonPrimitive("TAMPERED"))))
        val report = verifier.verify(materials(emptyList(), emptyMap(), events = events))
        assertEquals(CheckStatus.FAIL, statusOf(report, "hash_chain"))
    }

    // ------------------------------------------------------------ 4. 改中间记录

    @Test
    fun scenario4_modifiedMiddleRecord_failsChain() {
        val events = chainedEvents().toMutableList()
        events[1] = events[1].copy(type = "forged_type")
        val report = verifier.verify(materials(emptyList(), emptyMap(), events = events))
        assertEquals(CheckStatus.FAIL, statusOf(report, "hash_chain"))
    }

    // ------------------------------------------------------------ 5. 删除记录

    @Test
    fun scenario5_deletedRecord_failsChain() {
        val events = chainedEvents().toMutableList().also { it.removeAt(1) }
        val report = verifier.verify(materials(emptyList(), emptyMap(), events = events))
        assertEquals(CheckStatus.FAIL, statusOf(report, "hash_chain"))
    }

    // ------------------------------------------------------------ 6. 插入伪记录

    @Test
    fun scenario6_insertedForgedRecord_failsChain() {
        val events = chainedEvents().toMutableList()
        val forged = HashChain.withHash(event(99, "forged", events[0].hash))
        events.add(1, forged)
        val report = verifier.verify(materials(emptyList(), emptyMap(), events = events))
        assertEquals(CheckStatus.FAIL, statusOf(report, "hash_chain"))
    }

    // ------------------------------------------------------------ 7. 错误公钥

    @Test
    fun scenario7_wrongPublicKey_failsSignature() {
        val kp = ecKeyPair(); val other = ecKeyPair()
        val chain = chainedEvents()
        val sig = signatureRecord(kp, chain.last().hash!!, emptyMap())
        val report = verifier.verify(
            materials(
                emptyList(), emptyMap(), events = chain, signature = sig,
                publicKeys = mapOf("K1" to Base64.getEncoder().encodeToString(other.public.encoded)),
            ),
        )
        assertEquals(CheckStatus.FAIL, statusOf(report, "signature"))
    }

    // ------------------------------------------------------------ 8. 错误签名

    @Test
    fun scenario8_corruptedSignature_failsSignature() {
        val kp = ecKeyPair()
        val chain = chainedEvents()
        val sig = signatureRecord(kp, chain.last().hash!!, emptyMap())
            .copy(signatureBase64 = Base64.getEncoder().encodeToString(ByteArray(64) { 1 }))
        val report = verifier.verify(
            materials(
                emptyList(), emptyMap(), events = chain, signature = sig,
                publicKeys = mapOf("K1" to Base64.getEncoder().encodeToString(kp.public.encoded)),
            ),
        )
        assertEquals(CheckStatus.FAIL, statusOf(report, "signature"))
    }

    // ------------------------------------------------------------ 9. 密钥不可用（缺公钥）

    @Test
    fun scenario9_missingPublicKey_skippedNotPassed() {
        val kp = ecKeyPair()
        val chain = chainedEvents()
        val sig = signatureRecord(kp, chain.last().hash!!, emptyMap())
        val report = verifier.verify(
            materials(emptyList(), emptyMap(), events = chain, signature = sig, publicKeys = emptyMap()),
        )
        assertEquals(CheckStatus.SKIPPED, statusOf(report, "signature"))
        // 缺材料不得当作通过
        assertTrue(report.skippedCount >= 1)
    }

    // ------------------------------------------------------------ 10. 未签名会话

    @Test
    fun scenario10_unsignedSession_signatureSkipped() {
        val report = verifier.verify(materials(emptyList(), emptyMap()))
        assertEquals(CheckStatus.SKIPPED, statusOf(report, "signature"))
    }

    // ------------------------------------------------------------ 11. 历史（未入链）事件 → WARN

    @Test
    fun scenario11_legacyPreChainEvents_warn() {
        val legacy = listOf(
            EvidenceEvent(seq = 1, sessionId = "s1", wallMs = 1, monoMs = 1, type = "e1", source = EventSource.APP_OBSERVATION),
            EvidenceEvent(seq = 2, sessionId = "s1", wallMs = 2, monoMs = 2, type = "e2", source = EventSource.APP_OBSERVATION),
        )
        val report = verifier.verify(materials(emptyList(), emptyMap(), events = legacy))
        assertEquals(CheckStatus.WARN, statusOf(report, "hash_chain"))
        assertFalse(report.hasFailure)
    }

    // ------------------------------------------------------------ 12. 不支持格式版本

    @Test
    fun scenario12_unsupportedFormatVersion_fails() {
        val report = verifier.verify(materials(emptyList(), emptyMap(), formatVersion = 999))
        assertEquals(CheckStatus.FAIL, statusOf(report, "format_version"))
        assertTrue(report.hasFailure)
    }

    // ------------------------------------------------------------ 附加：跳行 WARN

    @Test
    fun skippedEventLines_producesWarnNotPass() {
        val report = verifier.verify(materials(emptyList(), emptyMap(), skippedLines = 1))
        assertEquals(CheckStatus.WARN, statusOf(report, "hash_chain"))
    }

    // ------------------------------------------------------------ 附加：单项通过不提升其他项

    @Test
    fun onePass_doesNotMaskOtherFailures() {
        val kp = ecKeyPair()
        val bytes = "ok".toByteArray()
        val f = file("media/a.mp4", bytes)
        val chain = chainedEvents().toMutableList()
        chain[1] = chain[1].copy(type = "tampered") // 链损坏
        val sig = signatureRecord(kp, "any", emptyMap())
        val report = verifier.verify(
            materials(
                listOf(f), mapOf("media/a.mp4" to bytes), events = chain, signature = sig,
                publicKeys = mapOf("K1" to Base64.getEncoder().encodeToString(kp.public.encoded)),
            ),
        )
        assertEquals(CheckStatus.PASS, statusOf(report, "file_integrity")) // 文件好
        assertEquals(CheckStatus.FAIL, statusOf(report, "hash_chain"))     // 链坏
        assertTrue(report.hasFailure)
    }

    // ------------------------------------------- 附加：路径安全（§5.7）

    @org.junit.Rule
    @JvmField
    val tmp = org.junit.rules.TemporaryFolder()

    @Test
    fun pathTraversalInManifest_failsPathSafety() {
        val root = tmp.newFolder("pkg").toPath()
        java.nio.file.Files.createDirectories(root.resolve("media"))
        val evil = file("../../etc/passwd", "x".toByteArray())
        val report = verifier.verify(
            materials(listOf(evil), emptyMap(), packageRoot = root),
        )
        assertEquals(CheckStatus.FAIL, statusOf(report, "path_safety"))
        assertTrue(report.hasFailure)
    }

    @Test
    fun absolutePathInManifest_failsPathSafety() {
        val root = tmp.newFolder("pkg2").toPath()
        java.nio.file.Files.createDirectories(root.resolve("media"))
        val evil = file("/etc/passwd", "x".toByteArray())
        val report = verifier.verify(materials(listOf(evil), emptyMap(), packageRoot = root))
        assertEquals(CheckStatus.FAIL, statusOf(report, "path_safety"))
    }

    @Test
    fun cleanPackage_pathSafetyPasses() {
        val root = tmp.newFolder("pkg3").toPath()
        java.nio.file.Files.createDirectories(root.resolve("media"))
        java.nio.file.Files.write(root.resolve("media/a.mp4"), "ok".toByteArray())
        val report = verifier.verify(
            materials(listOf(file("media/a.mp4", "ok".toByteArray())), mapOf("media/a.mp4" to "ok".toByteArray()), packageRoot = root),
        )
        assertEquals(CheckStatus.PASS, statusOf(report, "path_safety"))
    }

    // ------------------------------------------- 附加：未引用文件（§5.7）

    @Test
    fun unreferencedFileOnDisk_warns() {
        val root = tmp.newFolder("pkg4").toPath()
        java.nio.file.Files.createDirectories(root.resolve("media"))
        java.nio.file.Files.write(root.resolve("media/a.mp4"), "ok".toByteArray())
        java.nio.file.Files.write(root.resolve("media/extra.bin"), "sneaky".toByteArray()) // 未登记
        val report = verifier.verify(
            materials(listOf(file("media/a.mp4", "ok".toByteArray())), mapOf("media/a.mp4" to "ok".toByteArray()), packageRoot = root),
        )
        assertEquals(CheckStatus.WARN, statusOf(report, "unreferenced_files"))
        assertTrue(report.results.single { it.id == "unreferenced_files" }.detail.contains("extra.bin"))
    }

    // ------------------------------------------- 附加：清单↔签名绑定

    @Test
    fun manifestHashDiffersFromSignedFiles_failsBinding() {
        val kp = ecKeyPair()
        val bytes = "media".toByteArray()
        val real = file("media/a.mp4", bytes)
        // 签名覆盖的哈希与清单登记不同（清单被改）
        val sig = signatureRecord(kp, chainedEvents().last().hash!!, mapOf("media/a.mp4" to Sha256.of("other".toByteArray())))
        val report = verifier.verify(
            materials(
                listOf(real), mapOf("media/a.mp4" to bytes), signature = sig,
                publicKeys = mapOf("K1" to Base64.getEncoder().encodeToString(kp.public.encoded)),
            ),
        )
        assertEquals(CheckStatus.FAIL, statusOf(report, "signature_file_binding"))
    }

    @Test
    fun manifestMatchesSignedFiles_bindingPasses() {
        val kp = ecKeyPair()
        val bytes = "media".toByteArray()
        val f = file("media/a.mp4", bytes)
        val sig = signatureRecord(kp, chainedEvents().last().hash!!, mapOf("media/a.mp4" to f.sha256!!))
        val report = verifier.verify(
            materials(
                listOf(f), mapOf("media/a.mp4" to bytes), signature = sig,
                publicKeys = mapOf("K1" to Base64.getEncoder().encodeToString(kp.public.encoded)),
            ),
        )
        assertEquals(CheckStatus.PASS, statusOf(report, "signature_file_binding"))
    }

    @Test
    fun unsignedSession_bindingSkipped() {
        val report = verifier.verify(materials(listOf(file("media/a.mp4", "x".toByteArray())), emptyMap()))
        assertEquals(CheckStatus.SKIPPED, statusOf(report, "signature_file_binding"))
    }
}
