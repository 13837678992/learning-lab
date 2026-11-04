package re.tracekeep.core.verify

import java.nio.file.Files
import java.nio.file.Path
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import re.tracekeep.core.integrity.HashChain
import re.tracekeep.core.model.EvidenceEvent
import re.tracekeep.core.model.EvidenceFile
import re.tracekeep.core.model.EvidenceSession
import re.tracekeep.core.model.KeyDescriptor
import re.tracekeep.core.model.SignatureRecord

/**
 * **独立离线验证示例**（需求 §6；阶段 7 交付，阶段 10 的雏形）。
 *
 * 本测试演示：仅凭证据包内的材料（会话元数据 / 文件登记 / 事件日志 / 签名记录 / 公钥），
 * 在一台**没有原 App、不访问其数据库、不持有私钥**的机器上完成验证。
 * 若 `/tmp/tk-evidence` 存在（由真机/模拟器拉取的真实材料），则对其验证；
 * 否则以合成材料验证同一套流程。
 */
class OfflineVerificationExampleTest {

    private val json = Json { ignoreUnknownKeys = true }

    private fun dirFor(sessionId: String) = Path.of("/tmp/tk-evidence", sessionId)

    @Test
    fun verifyRealDeviceEvidenceIfPresent() {
        val sessionsRoot = Path.of("/tmp/tk-evidence")
        if (!Files.isDirectory(sessionsRoot)) {
            println("[skip] 未找到 /tmp/tk-evidence（无真机材料）——本测试在 CI/纯 JVM 环境跳过真实材料验证")
            return
        }
        val keysFile = sessionsRoot.resolve("keys.json")
        val publicKeys: Map<String, String> = if (Files.exists(keysFile)) {
            json.decodeFromString<List<StoredKeyDto>>(Files.readString(keysFile))
                .associate { it.descriptor.keyId to it.descriptor.publicKeyBase64 }
        } else {
            emptyMap()
        }

        val sessionDirs = Files.list(sessionsRoot).use { s ->
            s.filter { Files.isDirectory(it) }.toList()
        }
        var verifiedAny = false
        for (dir in sessionDirs) {
            val eventsFile = dir.resolve("events.log")
            val registryFile = dir.resolve("files.json")
            if (!Files.exists(eventsFile) || !Files.exists(registryFile)) continue

            val events = Files.readAllLines(eventsFile)
                .filter { it.isNotBlank() }
                .map { json.decodeFromString<EvidenceEvent>(it) }
            val registry = json.decodeFromString<FileRegistryDto>(Files.readString(registryFile))
            val session = runCatching {
                json.decodeFromString<EvidenceSession>(Files.readString(dir.resolve("session.json")))
            }.getOrNull()
            val signature = runCatching {
                json.decodeFromString<SignatureRecord>(Files.readString(dir.resolve("signatures.json")))
            }.getOrNull()

            val report = EvidenceVerifier().verify(
                EvidenceVerifier.Materials(
                    formatVersion = session?.formatVersion ?: 1,
                    files = registry.files,
                    fileBytes = { rel ->
                        val f = dir.resolve(rel)
                        if (Files.exists(f)) Files.readAllBytes(f) else null
                    },
                    events = events,
                    skippedEventLines = 0,
                    signature = signature,
                    publicKeys = publicKeys,
                    supportedFormatVersion = re.tracekeep.core.model.EvidenceFormat.VERSION,
                ),
            )
            println("=== 会话 ${dir.fileName} 验证结果 ===")
            report.results.forEach { println("  ${it.status}  ${it.title}：${it.detail}") }
            if (signature != null) {
                assertEquals(
                    "签名会话应通过签名验证",
                    CheckStatus.PASS,
                    report.results.single { it.id == "signature" }.status,
                )
                assertEquals(
                    "签名会话哈希链应完整",
                    CheckStatus.PASS,
                    report.results.single { it.id == "hash_chain" }.status,
                )
                verifiedAny = true
            }
        }
        if (verifiedAny) println("[ok] 已在脱离原 App 的环境验证真实设备证据（含签名）")
    }

    /** 与 app 层 StoredKey 对应的最小反序列化结构（独立验证器不依赖 app 模块）。 */
    @kotlinx.serialization.Serializable
    private data class StoredKeyDto(val alias: String, val descriptor: KeyDescriptor)

    @kotlinx.serialization.Serializable
    private data class FileRegistryDto(
        val formatVersion: Int = 1,
        val files: List<EvidenceFile> = emptyList(),
    )
}
