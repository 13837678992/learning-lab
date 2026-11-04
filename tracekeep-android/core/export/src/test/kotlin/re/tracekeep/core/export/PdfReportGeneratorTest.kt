package re.tracekeep.core.export

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * PDF 报告与写出器测试（阶段 9）：结构有效、确定性、含关键披露、禁误导措辞。
 */
class PdfReportGeneratorTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private fun manifest() = EvidenceManifest(
        formatVersion = 2,
        appVersionName = "0.1.5",
        sessionId = "s1",
        recordingType = "AUDIO",
        sessionState = "SEALED",
        saveStatus = "SAVED",
        deviceRecordedAtWallMs = 1_000_000,
        stoppedAtWallMs = 1_000_400,
        savedAtWallMs = 1_000_500,
        sealedAtWallMs = 1_000_600,
        deviceSummary = mapOf("model" to "test"),
        files = listOf(
            ManifestFile(
                relativePath = "a.m4a", role = "ORIGINAL", lifecycle = "FINALIZED",
                sizeBytes = 100, sha256 = "ab".repeat(32),
            ),
        ),
        events = ManifestLog(present = true, count = 10, sha256 = "cd".repeat(32)),
        hashChain = ManifestChain(chainHeadHash = "ef".repeat(32), chainedEventsCount = 10, intact = true),
        signature = ManifestSignature(
            objectType = "seal", objectVersion = 1, algorithm = "ECDSA_P256_SHA256",
            keyId = "K1", keyProtectionLevel = "SOFTWARE_BACKED",
            signedPayloadSha256 = "12".repeat(32), signedAtWallMs = 1_000_700,
            publicKeyBase64 = "MFkw…",
        ),
        thirdParty = ManifestThirdParty(statement = "本次记录没有第三方时间戳、第三方存证或外部身份认证。"),
        anomalies = listOf("事件日志有 1 行无法解析"),
        missingData = emptyList(),
    )

    @Test
    fun generatesValidPdfHeader() {
        val bytes = PdfReportGenerator.generate(manifest(), verification = null, exportVerification = null)
        val head = String(bytes.copyOfRange(0, 8), Charsets.US_ASCII)
        assertTrue("应为 PDF 头", head.startsWith("%PDF-"))
        val tail = String(bytes.copyOfRange(bytes.size - 6, bytes.size), Charsets.US_ASCII)
        assertTrue("应以 %%EOF 结尾", tail.contains("%%EOF"))
    }

    @Test
    fun deterministic_sameInputSameBytes() {
        val a = PdfReportGenerator.generate(manifest(), null, null)
        val b = PdfReportGenerator.generate(manifest(), null, null)
        assertTrue("同一输入应产生确定性输出", a.contentEquals(b))
    }

    @Test
    fun containsKeyDisclosures_asciiSummary() {
        val text = String(PdfReportGenerator.generate(manifest(), null, null), Charsets.US_ASCII)
        assertTrue("应声明设备时间非可信时间戳", text.contains("NOT a trusted timestamp"))
        assertTrue("应声明未使用第三方时间戳", text.contains("no timestamp service used"))
        assertTrue("应声明签名不代表真实/可采", text.contains("does not prove"))
        assertTrue("应如实记录密钥保护级别", text.contains("SOFTWARE_BACKED"))
    }

    @Test
    fun forbiddenWording_absent() {
        val text = String(PdfReportGenerator.generate(manifest(), null, null), Charsets.US_ASCII)
        listOf(
            "司法鉴定报告", "法院认证", "百分之百", "绝对不可篡改", "自动取得司法效力",
            "guaranteed admissible", "court-certified", "100% valid",
        ).forEach {
            assertTrue("报告不得含：$it", !text.contains(it))
        }
    }
}
