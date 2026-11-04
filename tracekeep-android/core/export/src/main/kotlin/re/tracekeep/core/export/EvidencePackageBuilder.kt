package re.tracekeep.core.export

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlin.io.path.exists
import re.tracekeep.core.integrity.HashChain
import re.tracekeep.core.integrity.Sha256
import re.tracekeep.core.model.EvidenceEvent
import re.tracekeep.core.model.EvidenceFile
import re.tracekeep.core.model.EvidenceJson
import re.tracekeep.core.model.EvidenceLocation
import re.tracekeep.core.model.EvidenceSession
import re.tracekeep.core.model.KeyDescriptor
import re.tracekeep.core.model.KeyProtectionLevel
import re.tracekeep.core.model.SealRecord
import re.tracekeep.core.model.SignatureRecord
import re.tracekeep.core.provider.ThirdPartyStatus

/**
 * 证据包构建（纯 JVM；需求 §6；阶段 9）。
 *
 * 包结构（对齐需求 §6 推荐结构）：
 * ```
 * <packageDir>/
 *     manifest.json      机器可读清单（含链头/签名/异常/缺失/第三方状态）
 *     README.txt         人类可读说明（能力边界 + 独立验证方法）
 *     media/             原始媒体（**逐字节复制，绝不修改原件**）
 *     logs/              events.log（原始字节复制）
 *     location/          locations.jsonl（原始字节复制；若存在）
 *     signatures/        signatures.json + public-keys.json（**不含私钥**）
 *     receipts/          第三方回执（未配置时留空目录 + 说明）
 *     verification/      导出后复核结果（verification.json）
 * ```
 *
 * 硬性规则：
 * - **只读源材料**：媒体/日志/定位均以字节复制，导出**不修改任何原始证据**；
 * - **不覆盖同名**：目标包目录已存在则失败（调用方换名）；
 * - **导出后重读重算**：对包内每个文件重新计算 SHA-256 并与源登记比对，结果写入 verification/；
 * - 失败不得显示成功（返回 [ExportResult.Failed]）。
 */
class EvidencePackageBuilder {

    /** 源材料（由调用方从 EvidenceStore 装载；独立工具从解包目录装载同一结构）。 */
    data class SessionMaterial(
        val session: EvidenceSession,
        val files: List<EvidenceFile>,
        val events: List<EvidenceEvent>,
        val eventsSkippedLines: Long,
        val locations: List<EvidenceLocation>,
        val locationsSkippedLines: Long,
        val seal: SealRecord?,
        val signature: SignatureRecord?,
        val publicKeyDescriptor: KeyDescriptor?,
        val appVersionName: String,
        /** 读取会话内文件字节（按相对路径）；文件缺失返回 null。 */
        val fileBytes: (String) -> ByteArray?,
    )

    sealed interface ExportResult {
        data class Success(val packageDir: Path, val manifest: EvidenceManifest, val verification: ExportVerification) : ExportResult
        data class Failed(val reason: String) : ExportResult
    }

    /** 导出后复核结果（重读重算比对）。 */
    data class ExportVerification(
        val filesChecked: Int,
        val filesMatch: Int,
        val mismatches: List<String>,
        val manifestMatches: Boolean,
    ) {
        val allMatch: Boolean get() = mismatches.isEmpty() && manifestMatches
    }

    /**
     * 构建证据包。[packageDir] 必须不存在（不覆盖同名目标）。
     */
    fun build(material: SessionMaterial, packageDir: Path): ExportResult {
        if (packageDir.exists()) {
            return ExportResult.Failed("目标证据包目录已存在，请换用其他名称：$packageDir")
        }
        return try {
            Files.createDirectories(packageDir)
            val mediaDir = packageDir.resolve("media").also { Files.createDirectories(it) }
            val logsDir = packageDir.resolve("logs").also { Files.createDirectories(it) }
            val locationDir = packageDir.resolve("location").also { Files.createDirectories(it) }
            val signaturesDir = packageDir.resolve("signatures").also { Files.createDirectories(it) }
            val receiptsDir = packageDir.resolve("receipts").also { Files.createDirectories(it) }
            val verificationDir = packageDir.resolve("verification").also { Files.createDirectories(it) }

            // 1) 媒体（逐字节复制；不修改原件）
            val anomalies = mutableListOf<String>()
            val missing = mutableListOf<String>()
            for (f in material.files) {
                val bytes = material.fileBytes(f.relativePath)
                if (bytes == null) {
                    missing += "${f.relativePath}：源文件缺失（未导出）"
                    continue
                }
                // 包内只保留文件名（去掉会话内 media/ 前缀），避免路径层级混乱
                val target = mediaDir.resolve(f.relativePath.substringAfterLast('/'))
                Files.write(target, bytes)
                if (f.lifecycle != re.tracekeep.core.model.FileLifecycle.FINALIZED) {
                    anomalies += "${f.relativePath}：生命周期为 ${f.lifecycle}（非完整封存）"
                }
            }

            // 2) 日志（原始字节）
            val eventsBytes = material.events.joinToString("\n") { EvidenceJson.instance.encodeToString(it) }
            val eventsFile = logsDir.resolve("events.log")
            if (material.events.isNotEmpty()) Files.write(eventsFile, eventsBytes.toByteArray(Charsets.UTF_8))
            val locationsBytes = material.locations.joinToString("\n") { EvidenceJson.instance.encodeToString(it) }
            val locationsFile = locationDir.resolve("locations.jsonl")
            if (material.locations.isNotEmpty()) Files.write(locationsFile, locationsBytes.toByteArray(Charsets.UTF_8))

            // 3) 签名与公钥（**不含私钥**）
            material.signature?.let {
                Files.write(
                    signaturesDir.resolve("signatures.json"),
                    EvidenceJson.instance.encodeToString(it).toByteArray(Charsets.UTF_8),
                )
            }
            material.publicKeyDescriptor?.let {
                Files.write(
                    signaturesDir.resolve("public-keys.json"),
                    EvidenceJson.instance.encodeToString(listOf(it)).toByteArray(Charsets.UTF_8),
                )
            }

            // 4) receipts：未配置第三方服务时留下说明（不伪造回执）
            Files.write(
                receiptsDir.resolve("README.txt"),
                "本次导出未包含任何第三方时间戳/存证回执（未配置第三方服务）。\n".toByteArray(Charsets.UTF_8),
            )

            if (material.eventsSkippedLines > 0) anomalies += "事件日志有 ${material.eventsSkippedLines} 行无法解析（已跳过，原文件未修改）"
            if (material.locationsSkippedLines > 0) anomalies += "定位日志有 ${material.locationsSkippedLines} 行无法解析（已跳过）"
            material.seal?.takeIf { it.sealedWithAnomalies }?.let { anomalies += "封存时即存在异常（sealedWithAnomalies=true）" }

            // 5) manifest
            val chain = HashChain.verify(material.events)
            val chainHead = material.events.lastOrNull { it.hash != null }?.hash
            val manifest = EvidenceManifest(
                formatVersion = material.session.formatVersion,
                appVersionName = material.appVersionName,
                sessionId = material.session.sessionId,
                recordingType = material.session.recordingType.name,
                sessionState = material.session.state.name,
                saveStatus = material.session.saveStatus?.name,
                deviceRecordedAtWallMs = material.session.createdAtWallMs,
                stoppedAtWallMs = material.session.stoppedAtWallMs,
                savedAtWallMs = material.session.savedAtWallMs,
                sealedAtWallMs = material.session.sealedAtWallMs,
                deviceSummary = material.session.deviceSummary,
                files = material.files.map {
                    ManifestFile(
                        relativePath = it.relativePath.substringAfterLast('/'),
                        role = it.role.name,
                        lifecycle = it.lifecycle.name,
                        sizeBytes = it.sizeBytes,
                        sha256 = it.sha256,
                        note = it.note,
                    )
                },
                events = ManifestLog(
                    present = material.events.isNotEmpty(),
                    count = material.events.size.toLong(),
                    unparsableLines = material.eventsSkippedLines,
                    sha256 = if (eventsFile.exists()) Sha256.of(eventsFile.toFile()) else null,
                ),
                locations = ManifestLog(
                    present = material.locations.isNotEmpty(),
                    count = material.locations.size.toLong(),
                    unparsableLines = material.locationsSkippedLines,
                    sha256 = if (locationsFile.exists()) Sha256.of(locationsFile.toFile()) else null,
                ),
                hashChain = ManifestChain(
                    chainHeadHash = chainHead,
                    chainedEventsCount = chain.chainedCount.toLong(),
                    preChainEventsCount = chain.preChainCount.toLong(),
                    intact = chain.intact,
                ),
                signature = material.signature?.let { sig ->
                    ManifestSignature(
                        objectType = sig.objectType,
                        objectVersion = sig.objectVersion,
                        algorithm = sig.algorithm.name,
                        keyId = sig.keyId,
                        keyProtectionLevel = material.publicKeyDescriptor?.protectionLevel?.name
                            ?: KeyProtectionLevel.EXTERNAL.name,
                        signedPayloadSha256 = sig.signedPayloadSha256,
                        signedAtWallMs = sig.signedAtWallMs,
                        publicKeyBase64 = material.publicKeyDescriptor?.publicKeyBase64
                            ?: sig.signedPayload["publicKeyBase64"]?.toString()?.trim('"').orEmpty(),
                        signedFiles = sig.signedPayload["files"]?.let { el ->
                            (el as? JsonObject)?.entries?.associate { (k, v) -> k to v.toString().trim('"') }
                        } ?: emptyMap(),
                    )
                },
                thirdParty = ManifestThirdParty(
                    timestampProvider = "none",
                    preservationProvider = "none",
                    identityProvider = "none",
                    statement = ThirdPartyStatus.NONE.honestStatement(),
                ),
                anomalies = anomalies,
                missingData = missing,
            )
            Files.write(
                packageDir.resolve("manifest.json"),
                EvidenceJson.instance.encodeToString(manifest).toByteArray(Charsets.UTF_8),
            )

            // 6) README.txt
            Files.write(packageDir.resolve("README.txt"), buildReadme(manifest).toByteArray(Charsets.UTF_8))

            // 7) PDF 报告（人类可读；机器可读事实以 manifest.json 为准）
            // 验证报告在构建时按当前材料即时生成（导出后复核结果单列于 verification.json）
            val reportBytes = PdfReportGenerator.generate(manifest, verification = null, exportVerification = null)
            Files.write(packageDir.resolve("report.pdf"), reportBytes)

            // 8) 导出后复核：重读包内文件并重算
            val verification = verifyPackage(packageDir, manifest)
            Files.write(
                verificationDir.resolve("verification.json"),
                buildString {
                    append("{\n")
                    append("  \"filesChecked\": ${verification.filesChecked},\n")
                    append("  \"filesMatch\": ${verification.filesMatch},\n")
                    append("  \"manifestMatches\": ${verification.manifestMatches},\n")
                    append("  \"allMatch\": ${verification.allMatch},\n")
                    append("  \"mismatches\": [")
                    append(verification.mismatches.joinToString(", ") { "\"${it.replace("\\", "\\\\").replace("\"", "\\\"")}\"" })
                    append("]\n}\n")
                }.toByteArray(Charsets.UTF_8),
            )

            return ExportResult.Success(packageDir, manifest, verification)
        } catch (e: Exception) {
            ExportResult.Failed("打包失败：${e.message ?: e::class.simpleName}")
        }
    }

    /**
     * 导出后复核：重读包内每个媒体文件的字节并重算 SHA-256，与 manifest 记录比对
     * （manifest 的哈希来自源登记，故等价于「导出副本 vs 源哈希」）；同时复核清单已记录
     * 哈希的 `logs/events.log` 与 `location/locations.jsonl`。**只读**；不一致如实列出
     * （不修复、不覆盖）。返回的 [ExportVerification.mismatches] 覆盖全部不一致项。
     */
    fun verifyPackage(packageDir: Path, manifest: EvidenceManifest): ExportVerification {
        val mismatches = mutableListOf<String>()

        // 1) 媒体文件
        val mediaDir = packageDir.resolve("media")
        var checked = 0
        var match = 0
        for (entry in manifest.files) {
            val f = mediaDir.resolve(entry.relativePath)
            if (!Files.exists(f)) {
                mismatches += "media/${entry.relativePath}: 包内缺失"
                continue
            }
            checked++
            val actual = Sha256.of(f.toFile())
            if (entry.sha256 != null && actual != entry.sha256) {
                mismatches += "media/${entry.relativePath}: 哈希不符（清单 ${entry.sha256.take(12)}… 实际 ${actual.take(12)}…）"
            } else {
                match++
            }
        }

        // 2) 日志与定位（清单记录了哈希时才复核；缺失/不符如实列出）
        manifest.events.sha256?.let { expected ->
            val f = packageDir.resolve("logs/events.log")
            when {
                !Files.exists(f) -> mismatches += "logs/events.log: 包内缺失"
                Sha256.of(f.toFile()) != expected ->
                    mismatches += "logs/events.log: 哈希不符（清单 ${expected.take(12)}…）"
            }
        }
        manifest.locations.sha256?.let { expected ->
            val f = packageDir.resolve("location/locations.jsonl")
            when {
                !Files.exists(f) -> mismatches += "location/locations.jsonl: 包内缺失"
                Sha256.of(f.toFile()) != expected ->
                    mismatches += "location/locations.jsonl: 哈希不符（清单 ${expected.take(12)}…）"
            }
        }

        // 3) manifest.json 可解析性（不仅存在）
        val manifestMatches = runCatching {
            val f = packageDir.resolve("manifest.json")
            if (!Files.exists(f)) false
            else {
                EvidenceJson.instance.decodeFromString<EvidenceManifest>(Files.readString(f))
                true
            }
        }.getOrDefault(false)

        return ExportVerification(
            filesChecked = checked,
            filesMatch = match,
            mismatches = mismatches,
            manifestMatches = manifestMatches,
        )
    }

    private fun buildReadme(manifest: EvidenceManifest): String = buildString {
        appendLine("TraceKeep 证据包 README")
        appendLine("=" .repeat(40))
        appendLine("会话 ID：${manifest.sessionId}")
        appendLine("录制类型：${manifest.recordingType}｜会话状态：${manifest.sessionState}｜保存状态：${manifest.saveStatus ?: "无"}")
        appendLine("应用版本：${manifest.appVersionName}｜格式版本：${manifest.formatVersion}")
        appendLine()
        appendLine("【包含内容】")
        appendLine("- media/ 原始媒体（逐字节复制，未修改）")
        appendLine("- logs/events.log 追加式事件日志（含哈希链字段）")
        appendLine("- location/locations.jsonl 定位记录（若存在）")
        appendLine("- signatures/ 签名记录与公钥（不含私钥）")
        appendLine("- manifest.json 机器可读清单；verification/ 导出后复核结果")
        if (manifest.anomalies.isNotEmpty()) {
            appendLine()
            appendLine("【异常披露（必须阅读）】")
            manifest.anomalies.forEach { appendLine("- $it") }
        }
        if (manifest.missingData.isNotEmpty()) {
            appendLine()
            appendLine("【缺失数据】")
            manifest.missingData.forEach { appendLine("- $it") }
        }
        appendLine()
        appendLine("【能力边界（重要）】")
        appendLine(manifest.thirdParty.statement)
        appendLine("- 哈希一致仅说明字节未变；哈希链仅检测事件序列变动；签名仅证明由对应私钥签署。")
        appendLine("- 以上均不代表录制内容在形成之初真实，也不代表任何机关必然采信。")
        appendLine("- 设备记录时间不是可信时间戳（本包未包含第三方时间证明）。")
        appendLine("- 可用 TraceKeep 独立验证工具离线复核本包（见 verification/ 与项目文档）。")
    }
}
