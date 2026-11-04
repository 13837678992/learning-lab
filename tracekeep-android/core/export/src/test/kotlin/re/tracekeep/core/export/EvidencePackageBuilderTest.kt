package re.tracekeep.core.export

import java.nio.file.Files
import java.nio.file.Path
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import re.tracekeep.core.integrity.HashChain
import re.tracekeep.core.integrity.Sha256
import re.tracekeep.core.model.EvidenceEvent
import re.tracekeep.core.model.EvidenceFile
import re.tracekeep.core.model.EvidenceFormat
import re.tracekeep.core.model.EvidenceJson
import re.tracekeep.core.model.EvidenceSession
import re.tracekeep.core.model.EventSource
import re.tracekeep.core.model.FileLifecycle
import re.tracekeep.core.model.FileRole
import re.tracekeep.core.model.RecordingType
import re.tracekeep.core.model.SaveStatus
import re.tracekeep.core.model.SessionState

/**
 * 证据包构建测试（阶段 9 验收：结构一致 / 不覆盖同名 / 导出后重算 / 不修改原件 / 失败不显示成功）。
 * 全部为合成材料，不构成正式证据。
 */
class EvidencePackageBuilderTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private fun event(seq: Long, type: String, prev: String?) = EvidenceEvent(
        seq = seq, sessionId = "s1", wallMs = 1_000_000 + seq, monoMs = 500 + seq,
        type = type, source = EventSource.APP_OBSERVATION, prevHash = prev,
    )

    private fun chainedEvents(): List<EvidenceEvent> {
        val out = mutableListOf<EvidenceEvent>()
        var prev: String? = null
        listOf("session_created", "session_started", "session_stopped", "recording_saved").forEachIndexed { i, t ->
            val e = HashChain.withHash(event(i + 1L, t, prev ?: HashChain.GENESIS_PREV_HASH))
            out += e; prev = e.hash
        }
        return out
    }

    private fun material(mediaBytes: ByteArray = "media-content".toByteArray()) = run {
        val file = EvidenceFile(
            fileId = "f1", sessionId = "s1", relativePath = "media/a.m4a", role = FileRole.ORIGINAL,
            lifecycle = FileLifecycle.FINALIZED, createdWallMs = 1,
            sizeBytes = mediaBytes.size.toLong(), sha256 = Sha256.of(mediaBytes), finalizedWallMs = 2,
        )
        EvidencePackageBuilder.SessionMaterial(
            session = EvidenceSession(
                sessionId = "s1", recordingType = RecordingType.AUDIO, state = SessionState.STOPPED,
                createdAtWallMs = 1_000_000, createdAtMonoMs = 500,
                saveStatus = SaveStatus.SAVED, savedAtWallMs = 1_000_500, stoppedAtWallMs = 1_000_400,
                deviceSummary = mapOf("model" to "test"),
            ),
            files = listOf(file),
            events = chainedEvents(),
            eventsSkippedLines = 0,
            locations = emptyList(),
            locationsSkippedLines = 0,
            seal = null,
            signature = null,
            publicKeyDescriptor = null,
            appVersionName = "0.1.5",
            fileBytes = { rel -> if (rel == "media/a.m4a") mediaBytes else null },
        )
    }

    // ------------------------------------------------------------ 结构与内容

    @Test
    fun build_createsExpectedStructure_andManifest() {
        val material = material()
        val target = tempFolder.root.toPath().resolve("evp-1")
        val result = EvidencePackageBuilder().build(material, target)
        assertTrue(result is EvidencePackageBuilder.ExportResult.Success)
        val success = result as EvidencePackageBuilder.ExportResult.Success

        assertTrue(Files.exists(target.resolve("manifest.json")))
        assertTrue(Files.exists(target.resolve("README.txt")))
        assertTrue(Files.exists(target.resolve("media/a.m4a")))
        assertTrue(Files.exists(target.resolve("logs/events.log")))
        assertTrue(Files.exists(target.resolve("receipts/README.txt")))
        assertTrue(success.verification.allMatch)

        // manifest 关键字段
        val m = success.manifest
        assertEquals("s1", m.sessionId)
        assertEquals("AUDIO", m.recordingType)
        assertEquals(4, m.hashChain.chainedEventsCount.toInt())
        assertTrue(m.hashChain.intact)
        assertTrue(m.hashChain.chainHeadHash != null)
        assertEquals("none", m.thirdParty.timestampProvider)
    }

    @Test
    fun manifest_recordsAnomaliesAndMissingData() {
        val material = material().let {
            it.copy(
                eventsSkippedLines = 2,
                files = it.files + EvidenceFile(
                    fileId = "f2", sessionId = "s1", relativePath = "media/missing.mp4",
                    role = FileRole.ORIGINAL, lifecycle = FileLifecycle.INCOMPLETE, createdWallMs = 1,
                ),
            )
        }
        val target = tempFolder.root.toPath().resolve("evp-2")
        val result = EvidencePackageBuilder().build(material, target)
            as EvidencePackageBuilder.ExportResult.Success
        assertTrue(result.manifest.anomalies.any { it.contains("无法解析") })
        assertTrue(result.manifest.missingData.any { it.contains("missing.mp4") })
    }

    // ------------------------------------------------------------ 不覆盖同名

    @Test
    fun build_failsWhenTargetExists() {
        val target = tempFolder.newFolder("existing").toPath()
        val result = EvidencePackageBuilder().build(material(), target)
        assertTrue("已存在目标目录时必须失败（不覆盖）", result is EvidencePackageBuilder.ExportResult.Failed)
    }

    // ------------------------------------------------------------ 不修改原件

    @Test
    fun build_doesNotModifySourceBytes() {
        val sourceBytes = "original-media-bytes".toByteArray()
        val sourceHash = Sha256.of(sourceBytes)
        val material = material(sourceBytes)
        val target = tempFolder.root.toPath().resolve("evp-3")
        EvidencePackageBuilder().build(material, target)
        // 源材料哈希不变（构建过程只读取）
        assertEquals(sourceHash, Sha256.of(sourceBytes))
    }

    // ------------------------------------------------------------ 导出后重算检出篡改

    @Test
    fun verifyPackage_detectsTamperedExport() {
        val target = tempFolder.root.toPath().resolve("evp-4")
        val result = EvidencePackageBuilder().build(material(), target)
            as EvidencePackageBuilder.ExportResult.Success
        // 篡改包内媒体
        val f = target.resolve("media/a.m4a")
        val b = Files.readAllBytes(f); b[0] = (b[0] + 1).toByte(); Files.write(f, b)
        val v = EvidencePackageBuilder().verifyPackage(target, result.manifest)
        assertFalse(v.allMatch)
        assertTrue(v.mismatches.any { it.contains("哈希不符") })
    }

    @Test
    fun verifyPackage_detectsTamperedEventLog() {
        val target = tempFolder.root.toPath().resolve("evp-5")
        val result = EvidencePackageBuilder().build(material(), target)
            as EvidencePackageBuilder.ExportResult.Success
        // 篡改包内事件日志（清单已记录其哈希）
        val f = target.resolve("logs/events.log")
        val b = Files.readAllBytes(f); Files.write(f, b + "tampered\n".toByteArray())
        val v = EvidencePackageBuilder().verifyPackage(target, result.manifest)
        assertFalse("事件日志被改后复核必须检出", v.allMatch)
        assertTrue(v.mismatches.any { it.contains("events.log") })
    }

    @Test
    fun verifyPackage_passesForUntouchedExport() {
        val target = tempFolder.root.toPath().resolve("evp-6")
        val result = EvidencePackageBuilder().build(material(), target)
            as EvidencePackageBuilder.ExportResult.Success
        val v = EvidencePackageBuilder().verifyPackage(target, result.manifest)
        assertTrue("未改动的导出包复核应全通过", v.allMatch)
        assertTrue(v.manifestMatches)
    }
}
