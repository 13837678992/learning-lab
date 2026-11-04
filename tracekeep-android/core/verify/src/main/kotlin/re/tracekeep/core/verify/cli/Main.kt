package re.tracekeep.core.verify.cli

import java.nio.file.Files
import java.nio.file.Path
import kotlin.system.exitProcess
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import re.tracekeep.core.model.EvidenceEvent
import re.tracekeep.core.model.EvidenceFile
import re.tracekeep.core.model.EvidenceFormat
import re.tracekeep.core.model.FileLifecycle
import re.tracekeep.core.model.FileRole
import re.tracekeep.core.model.KeyDescriptor
import re.tracekeep.core.model.SignatureRecord
import re.tracekeep.core.verify.CheckStatus
import re.tracekeep.core.verify.EvidenceVerifier

/**
 * 独立离线验证工具（需求 §6；阶段 10）。
 *
 * 用法：
 * ```
 * ./gradlew :core:verify:run --args="/path/to/TraceKeep-xxxxxxxx"
 * java -jar tracekeep-verify.jar /path/to/TraceKeep-xxxxxxxx
 * ```
 *
 * 特性（需求 §6 验收）：
 * - **离线**：不联网；
 * - **独立**：不依赖 Android 运行时、原 App 数据库、原 App 私钥；
 * - 仅使用包内材料（media/、logs/、signatures/ 公钥、manifest.json）；
 * - 逐项输出 PASS / FAIL / WARN / SKIPPED 并解释原因；
 * - 存在任一 FAIL 时退出码非零（便于脚本/自动化判定）。
 *
 * 依赖约束：本 CLI 位于 core:verify，**不得**依赖 core:export（后者已依赖前者，避免环）；
 * 因此对 manifest.json 采用**本地最小 DTO**读取（`ignoreUnknownKeys` 容忍多余字段）。
 */
fun main(args: Array<String>) {
    if (args.isEmpty() || args[0] in setOf("-h", "--help")) {
        println(USAGE)
        exitProcess(if (args.isEmpty()) 2 else 0)
    }
    val packageDir = Path.of(args[0])
    if (!Files.isDirectory(packageDir)) {
        System.err.println("错误：不是有效目录：$packageDir")
        exitProcess(2)
    }

    val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    println("TraceKeep 独立验证工具（离线）")
    println("证据包：$packageDir")
    println("=".repeat(60))

    val structureNotes = mutableListOf<String>()

    // manifest.json（本地最小 DTO 读取；用于文件登记与公钥来源）
    val manifest: ManifestView? = runCatching {
        val f = packageDir.resolve("manifest.json")
        if (Files.exists(f)) json.decodeFromString<ManifestDto>(Files.readString(f)).let {
            ManifestView(it.sessionId, it.formatVersion, it.files, it.signature)
        } else null
    }.getOrNull()
    if (manifest == null) structureNotes += "缺少或无法解析 manifest.json（将仅基于包内文件与日志验证）"

    // 事件日志
    val eventsFile = packageDir.resolve("logs/events.log")
    val events = mutableListOf<EvidenceEvent>()
    var skippedLines = 0L
    if (Files.exists(eventsFile)) {
        Files.readAllLines(eventsFile).forEach { line ->
            if (line.isBlank()) return@forEach
            runCatching { json.decodeFromString<EvidenceEvent>(line) }
                .onSuccess { events += it }
                .onFailure { skippedLines++ }
        }
    } else {
        structureNotes += "缺少 logs/events.log"
    }

    // 文件登记：来自 manifest（独立工具不读原 App 数据库）
    val files: List<EvidenceFile> = manifest?.files?.map { mf ->
        EvidenceFile(
            fileId = mf.relativePath,
            sessionId = manifest.sessionId,
            relativePath = mf.relativePath,
            role = runCatching { FileRole.valueOf(mf.role) }.getOrDefault(FileRole.ORIGINAL),
            lifecycle = runCatching { FileLifecycle.valueOf(mf.lifecycle) }.getOrDefault(FileLifecycle.INCOMPLETE),
            createdWallMs = 0,
            sizeBytes = mf.sizeBytes,
            sha256 = mf.sha256,
            note = mf.note,
        )
    } ?: emptyList()

    // 包根目录用于路径安全 / 未引用文件扫描；fileBytes 解析前先做穿越防护（不信任清单）。
    val mediaRoot = packageDir.resolve("media").normalize()

    // 签名记录 + 公钥（优先独立公钥文件；无则用 manifest 内嵌公钥）
    val signature: SignatureRecord? = runCatching {
        val f = packageDir.resolve("signatures/signatures.json")
        if (Files.exists(f)) json.decodeFromString<SignatureRecord>(Files.readString(f)) else null
    }.getOrNull()
    val publicKeys: Map<String, String> = runCatching {
        val f = packageDir.resolve("signatures/public-keys.json")
        if (Files.exists(f)) {
            json.decodeFromString<List<KeyDescriptor>>(Files.readString(f)).associate { it.keyId to it.publicKeyBase64 }
        } else emptyMap()
    }.getOrDefault(emptyMap()).ifEmpty {
        manifest?.signature?.let { mapOf(it.keyId to it.publicKeyBase64) } ?: emptyMap()
    }

    val materials = EvidenceVerifier.Materials(
        formatVersion = manifest?.formatVersion ?: EvidenceFormat.VERSION,
        files = files,
        fileBytes = { rel ->
            // 路径穿越防护：清单不可信，解析后必须仍在 media/ 内，否则视为不可读（由 path_safety 项报告）
            val candidate = runCatching { mediaRoot.resolve(rel).normalize() }.getOrNull()
            if (candidate != null && candidate.startsWith(mediaRoot) && Files.isRegularFile(candidate) && !Files.isSymbolicLink(candidate)) {
                Files.readAllBytes(candidate)
            } else null
        },
        events = events,
        skippedEventLines = skippedLines,
        signature = signature,
        publicKeys = publicKeys,
        supportedFormatVersion = EvidenceFormat.VERSION,
        packageRoot = packageDir,
    )

    val report = EvidenceVerifier().verify(materials)

    report.results.forEach { r ->
        println("${statusTag(r.status)} ${r.title}")
        if (r.detail.isNotBlank()) println("      ${r.detail}")
    }
    if (structureNotes.isNotEmpty()) {
        println("${statusTag(CheckStatus.WARN)} 包结构提示")
        structureNotes.forEach { println("      $it") }
    }

    println("-".repeat(60))
    println("汇总：PASS ${report.passCount}｜FAIL ${report.failCount}｜WARN ${report.warnCount}｜SKIPPED ${report.skippedCount}")
    println()
    println("能力边界（必读）：")
    println("· 哈希一致仅说明字节未变，不等于内容真实；")
    println("· 哈希链完整仅说明事件序列未被改动，不是可信时间证明；")
    println("· 签名有效仅说明由对应私钥签署，不代表身份已认证或内容真实；")
    println("· 本工具不判断证据的真实性、合法性、关联性或是否被法院采信。")

    exitProcess(if (report.hasFailure) 1 else 0)
}

private fun statusTag(s: CheckStatus): String = when (s) {
    CheckStatus.PASS -> "[PASS]"
    CheckStatus.FAIL -> "[FAIL]"
    CheckStatus.WARN -> "[WARN]"
    CheckStatus.SKIPPED -> "[SKIP]"
}

// ---- manifest.json 最小视图（core:verify 不能依赖 core:export，避免环） ----

@Serializable
private data class ManifestDto(
    val sessionId: String = "unknown",
    val formatVersion: Int = 1,
    val files: List<ManifestFileDto> = emptyList(),
    val signature: ManifestSignatureDto? = null,
)

@Serializable
private data class ManifestFileDto(
    val relativePath: String,
    val role: String = "ORIGINAL",
    val lifecycle: String = "INCOMPLETE",
    val sizeBytes: Long? = null,
    val sha256: String? = null,
    val note: String? = null,
)

@Serializable
private data class ManifestSignatureDto(
    val keyId: String = "",
    val publicKeyBase64: String = "",
)

private data class ManifestView(
    val sessionId: String,
    val formatVersion: Int,
    val files: List<ManifestFileDto>,
    val signature: ManifestSignatureDto?,
)

private val USAGE = """
TraceKeep 独立离线验证工具（阶段 10）

用法：
  tracekeep-verify <证据包目录>

说明：
  · 离线运行，不联网；不依赖原 App、原 App 数据库或私钥；
  · 输入为 TraceKeep 导出的证据包目录（含 manifest.json / media/ / logs/ / signatures/）；
  · 逐项输出 PASS/FAIL/WARN/SKIPPED；存在 FAIL 时退出码为 1。
""".trimIndent()
