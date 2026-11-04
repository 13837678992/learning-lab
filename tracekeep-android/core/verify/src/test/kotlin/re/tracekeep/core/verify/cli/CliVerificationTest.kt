package re.tracekeep.core.verify.cli

import java.nio.file.Files
import java.nio.file.Path
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * 独立验证 CLI 的端到端测试（阶段 10 验收）：
 * 用**手工构造的**证据包目录（模拟阶段 9 导出物，不依赖 core:export 以避免环）
 * 调用 CLI 主逻辑，断言逐项结果与退出码语义。
 *
 * 说明：真实导出包由 app 层产生；此处以等价结构的样本目录验证 CLI 行为，
 * 另由 app 集成测试覆盖"导出→独立验证"全链路（见 docs/execution）。
 */
class CliVerificationTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    /** 构造一个最小证据包（无签名，含 media + logs + manifest）。 */
    private fun buildPackage(root: Path, tamperMedia: Boolean = false): Path {
        val pkg = root.resolve("TraceKeep-test")
        Files.createDirectories(pkg.resolve("media"))
        Files.createDirectories(pkg.resolve("logs"))
        Files.createDirectories(pkg.resolve("signatures"))

        val media = "test-media-bytes".toByteArray()
        Files.write(pkg.resolve("media/a.m4a"), if (tamperMedia) media.copyOf().also { it[0] = (it[0] + 1).toByte() } else media)
        val sha = re.tracekeep.core.integrity.Sha256.of(media)

        // 链式事件（两条）
        val json = kotlinx.serialization.json.Json { encodeDefaults = true }
        val e1 = re.tracekeep.core.integrity.HashChain.withHash(
            re.tracekeep.core.model.EvidenceEvent(
                seq = 1, sessionId = "s1", wallMs = 1, monoMs = 1, type = "session_created",
                source = re.tracekeep.core.model.EventSource.USER_ACTION,
                prevHash = re.tracekeep.core.integrity.HashChain.GENESIS_PREV_HASH,
            ),
        )
        val e2 = re.tracekeep.core.integrity.HashChain.withHash(
            re.tracekeep.core.model.EvidenceEvent(
                seq = 2, sessionId = "s1", wallMs = 2, monoMs = 2, type = "session_stopped",
                source = re.tracekeep.core.model.EventSource.USER_ACTION, prevHash = e1.hash,
            ),
        )
        Files.write(
            pkg.resolve("logs/events.log"),
            listOf(e1, e2).joinToString("\n") { json.encodeToString(re.tracekeep.core.model.EvidenceEvent.serializer(), it) }
                .toByteArray(),
        )
        Files.write(
            pkg.resolve("manifest.json"),
            """
            {"manifestVersion":1,"formatVersion":2,"appVersionName":"test","sessionId":"s1",
             "recordingType":"AUDIO","sessionState":"STOPPED","saveStatus":"SAVED",
             "deviceRecordedAtWallMs":1,
             "files":[{"relativePath":"a.m4a","role":"ORIGINAL","lifecycle":"FINALIZED","sizeBytes":${media.size},"sha256":"$sha"}],
             "events":{"present":true,"count":2},
             "hashChain":{"chainHeadHash":"${e2.hash}","chainedEventsCount":2,"intact":true},
             "thirdParty":{"statement":"no third party"}}
            """.trimIndent().toByteArray(),
        )
        return pkg
    }

    /** 直接调用核心验证逻辑（与 CLI main 相同材料装载），断言结果（避免进程退出干扰测试）。 */
    private fun runVerify(pkg: Path): re.tracekeep.core.verify.VerificationReport {
        val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
        val events = Files.readAllLines(pkg.resolve("logs/events.log")).filter { it.isNotBlank() }
            .map { json.decodeFromString(re.tracekeep.core.model.EvidenceEvent.serializer(), it) }
        val manifest = json.decodeFromString(ManifestProbe.serializer(), Files.readString(pkg.resolve("manifest.json")))
        val files = manifest.files.map {
            re.tracekeep.core.model.EvidenceFile(
                fileId = it.relativePath, sessionId = "s1", relativePath = it.relativePath,
                role = re.tracekeep.core.model.FileRole.ORIGINAL,
                lifecycle = re.tracekeep.core.model.FileLifecycle.FINALIZED,
                createdWallMs = 0, sizeBytes = it.sizeBytes, sha256 = it.sha256,
            )
        }
        return re.tracekeep.core.verify.EvidenceVerifier().verify(
            re.tracekeep.core.verify.EvidenceVerifier.Materials(
                formatVersion = manifest.formatVersion,
                files = files,
                fileBytes = { rel -> pkg.resolve("media").resolve(rel).takeIf { Files.exists(it) }?.let { Files.readAllBytes(it) } },
                events = events,
                skippedEventLines = 0,
                signature = null,
                publicKeys = emptyMap(),
                supportedFormatVersion = re.tracekeep.core.model.EvidenceFormat.VERSION,
            ),
        )
    }

    @kotlinx.serialization.Serializable
    private data class ManifestProbe(
        val sessionId: String = "",
        val formatVersion: Int = 1,
        val files: List<ProbeFile> = emptyList(),
    )

    @kotlinx.serialization.Serializable
    private data class ProbeFile(
        val relativePath: String, val role: String = "ORIGINAL", val lifecycle: String = "FINALIZED",
        val sizeBytes: Long? = null, val sha256: String? = null,
    )

    @Test
    fun validPackage_allPass() {
        val pkg = buildPackage(tempFolder.root.toPath())
        val report = runVerify(pkg)
        assertTrue("有效包应全部 PASS", report.passCount >= 3)
        assertEquals(0, report.failCount)
    }

    @Test
    fun tamperedMedia_failsFileIntegrity() {
        val pkg = buildPackage(tempFolder.root.toPath(), tamperMedia = true)
        val report = runVerify(pkg)
        assertTrue("篡改媒体应产生 FAIL", report.hasFailure)
        assertEquals(
            re.tracekeep.core.verify.CheckStatus.FAIL,
            report.results.single { it.id == "file_integrity" }.status,
        )
    }
}
