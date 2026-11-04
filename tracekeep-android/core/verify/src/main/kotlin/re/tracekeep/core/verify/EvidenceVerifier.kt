package re.tracekeep.core.verify

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import re.tracekeep.core.crypto.SignatureVerifier
import re.tracekeep.core.integrity.HashChain
import re.tracekeep.core.integrity.Sha256
import re.tracekeep.core.model.EvidenceEvent
import re.tracekeep.core.model.EvidenceFile
import re.tracekeep.core.model.FileLifecycle
import re.tracekeep.core.model.KeyDescriptor
import re.tracekeep.core.model.SignatureRecord

/**
 * 证据验证器（纯 JVM；需求 §5/§6；阶段 7 交付，阶段 10 独立验证工具的地基）。
 *
 * 设计约束（需求 §6「独立验证工具」）：
 * - **不依赖 Android 运行时、Activity、UI、原 App 数据库/状态、原始私钥**；
 * - 输入为"已读取的证据材料"（文件登记 + 事件序列 + 签名记录 + 公钥 + 文件字节访问），
 *   调用方（App 内校验 / 阶段 10 独立工具）负责按各自方式装载这些材料；
 * - 逐项输出 [CheckResult]（PASS/FAIL/WARN/SKIPPED），**不做"整体可信"结论**。
 *
 * 能证明与不能证明（写入报告时必须一致）：
 * - 能：文件字节是否与登记哈希一致；事件链是否自洽；签名是否由该公钥对应的私钥产生；
 * - 不能：内容是否真实、录制过程是否合法、上链前数据是否未被篡改、法院是否采信。
 */
class EvidenceVerifier {

    /** 验证所需材料（由调用方装载；独立工具与 App 内校验共用）。 */
    data class Materials(
        val formatVersion: Int,
        /** 文件登记（含 role/lifecycle/sha256）。 */
        val files: List<EvidenceFile>,
        /** 相对路径 → 实际字节读取器（独立工具读目录；App 读私有存储）。 */
        val fileBytes: (String) -> ByteArray?,
        /** 事件序列（按写入顺序）。 */
        val events: List<EvidenceEvent>,
        /** 事件日志中无法解析的行数（读入侧统计；如实披露）。 */
        val skippedEventLines: Long = 0,
        /** 待验证的签名记录（可为 null：未签名会话）。 */
        val signature: SignatureRecord?,
        /** 已知公钥（keyId → 公钥 Base64）。 */
        val publicKeys: Map<String, String>,
        /** 应用支持的最大格式版本（用于兼容性判定）。 */
        val supportedFormatVersion: Int,
        /**
         * 证据包根目录（可选）。提供时执行「路径安全」与「未引用文件」检查
         * （需求 §5.7：导出包路径穿越/符号链接防护、未引用文件检测）。
         * App 内校验与独立 CLI 均传入导出包目录；无目录的纯材料校验传 null（该项 SKIPPED）。
         */
        val packageRoot: Path? = null,
    )

    fun verify(materials: Materials): VerificationReport {
        val results = mutableListOf<CheckResult>()

        results += checkFormatVersion(materials)
        results += checkPathSafety(materials)
        results += checkFileIntegrity(materials)
        results += checkUnreferencedFiles(materials)
        results += checkChain(materials)
        results += checkSignature(materials)
        results += checkSignatureFileBinding(materials)

        return VerificationReport(results)
    }

    // ------------------------------------------------------------ 路径安全

    /**
     * 路径安全（需求 §5.7、§8）：清单中的相对路径不得为绝对路径、含 `..` 或反斜杠；
     * 解析到包内 `media/` 后必须仍在 `media/` 内（双防线：normalize + startsWith）；
     * 同时拒绝符号链接（防止包外读取）。任一违规 → FAIL（不得静默通过）。
     */
    private fun checkPathSafety(m: Materials): CheckResult {
        val root = m.packageRoot
            ?: return CheckResult("path_safety", "路径安全（穿越/符号链接）", CheckStatus.SKIPPED, "未提供包目录，无法执行路径检查")
        if (m.files.isEmpty()) {
            return CheckResult("path_safety", "路径安全（穿越/符号链接）", CheckStatus.SKIPPED, "无文件登记记录")
        }
        val mediaDir = root.resolve("media")
        val problems = mutableListOf<String>()
        for (f in m.files) {
            val rel = f.relativePath
            if (rel.isBlank() || rel.contains('\\') || Paths.get(rel).isAbsolute || rel.startsWith("/")) {
                problems += "$rel：非法相对路径（空/绝对/含反斜杠）"
                continue
            }
            if (rel.split('/').any { it == ".." }) {
                problems += "$rel：含路径穿越段 .."
                continue
            }
            val resolved = mediaDir.resolve(rel).normalize()
            if (!resolved.startsWith(mediaDir.normalize())) {
                problems += "$rel：解析后逃逸出 media/"
                continue
            }
            if (resolved.any { Files.isSymbolicLink(it) }) {
                problems += "$rel：路径中包含符号链接（拒绝）"
            }
        }
        val status = if (problems.isNotEmpty()) CheckStatus.FAIL else CheckStatus.PASS
        val detail = if (problems.isEmpty()) {
            "已检查 ${m.files.size} 个登记路径，无穿越/绝对路径/符号链接"
        } else {
            problems.joinToString("；")
        }
        return CheckResult("path_safety", "路径安全（穿越/符号链接）", status, detail)
    }

    // ------------------------------------------------------------ 未引用文件

    /**
     * 未引用文件（需求 §5.7）：`media/` 下存在但清单未登记的文件 → WARN 并逐一列出
     * （不判 FAIL——可能是用户自加材料；但必须披露，不得静默忽略）。
     */
    private fun checkUnreferencedFiles(m: Materials): CheckResult {
        val root = m.packageRoot
            ?: return CheckResult("unreferenced_files", "未引用文件", CheckStatus.SKIPPED, "未提供包目录，无法扫描")
        val mediaDir = root.resolve("media")
        if (!Files.isDirectory(mediaDir)) {
            return CheckResult("unreferenced_files", "未引用文件", CheckStatus.SKIPPED, "无 media/ 目录")
        }
        val referenced = m.files.map { it.relativePath.substringAfterLast('/') }.toSet()
        val onDisk = Files.walk(mediaDir).use { stream ->
            stream.filter { Files.isRegularFile(it) }
                .map { mediaDir.relativize(it).toString().replace('\\', '/') }
                .toList()
        }
        val unreferenced = onDisk.filter { it.substringAfterLast('/') !in referenced }
        return if (unreferenced.isEmpty()) {
            CheckResult("unreferenced_files", "未引用文件", CheckStatus.PASS, "包内 ${onDisk.size} 个媒体文件均已在清单登记")
        } else {
            CheckResult(
                "unreferenced_files", "未引用文件", CheckStatus.WARN,
                "包内存在清单未登记的文件 ${unreferenced.size} 个：${unreferenced.joinToString("；")}",
            )
        }
    }

    // ------------------------------------------------------------ 格式版本

    private fun checkFormatVersion(m: Materials): CheckResult {
        val ok = m.formatVersion in 1..m.supportedFormatVersion
        return CheckResult(
            id = "format_version",
            title = "证据格式版本兼容性",
            status = if (ok) CheckStatus.PASS else CheckStatus.FAIL,
            detail = if (ok) {
                "formatVersion=${m.formatVersion} 在支持范围 1..${m.supportedFormatVersion}"
            } else {
                "formatVersion=${m.formatVersion} 不受支持（支持上限 ${m.supportedFormatVersion}）——需更新验证器"
            },
        )
    }

    // ------------------------------------------------------------ 文件完整性

    private fun checkFileIntegrity(m: Materials): CheckResult {
        if (m.files.isEmpty()) {
            return CheckResult("file_integrity", "文件完整性", CheckStatus.SKIPPED, "无文件登记记录")
        }
        val problems = mutableListOf<String>()
        var checked = 0
        for (f in m.files) {
            val registeredHash = f.sha256
            if (f.lifecycle != FileLifecycle.FINALIZED || registeredHash == null) {
                // 未封装文件如实披露，但不判为 FAIL（它本就不是完整证据）
                problems += "${f.relativePath}: 未封装（lifecycle=${f.lifecycle}）"
                continue
            }
            val bytes = m.fileBytes(f.relativePath)
            if (bytes == null) {
                problems += "${f.relativePath}: 文件缺失"
                continue
            }
            val actual = Sha256.of(bytes)
            if (actual != registeredHash) {
                problems += "${f.relativePath}: 哈希不符（登记 ${registeredHash.take(12)}… 实际 ${actual.take(12)}…）"
            } else {
                checked++
            }
        }
        val failed = problems.any { it.contains("哈希不符") || it.contains("缺失") }
        val status = when {
            failed -> CheckStatus.FAIL
            problems.isNotEmpty() -> CheckStatus.WARN
            else -> CheckStatus.PASS
        }
        val detail = buildString {
            append("通过 $checked/${m.files.size} 项")
            if (problems.isNotEmpty()) append("；异常：").append(problems.joinToString("；"))
        }
        return CheckResult("file_integrity", "文件完整性（重算 SHA-256）", status, detail)
    }

    // ------------------------------------------------------------ 哈希链

    private fun checkChain(m: Materials): CheckResult {
        if (m.events.isEmpty()) {
            return CheckResult("hash_chain", "事件哈希链", CheckStatus.SKIPPED, "无事件记录")
        }
        val chain = HashChain.verify(m.events)
        val detail = buildString {
            append("入链 ${chain.chainedCount} 条")
            if (chain.preChainCount > 0) {
                append("；未入链（阶段 7 前历史事件）${chain.preChainCount} 条")
            }
            if (m.skippedEventLines > 0) {
                append("；无法解析行 ${m.skippedEventLines}")
            }
            if (chain.firstAnomalyIndex >= 0) {
                val a = chain.results[chain.firstAnomalyIndex]
                append("；首个异常：第 ${a.index + 1} 条（seq=${a.seq}）${a.status} ${a.detail}")
            }
        }
        val status = when {
            !chain.intact -> CheckStatus.FAIL
            m.skippedEventLines > 0 -> CheckStatus.WARN
            chain.preChainCount > 0 -> CheckStatus.WARN
            else -> CheckStatus.PASS
        }
        return CheckResult("hash_chain", "事件哈希链连续性", status, detail)
    }

    // ------------------------------------------------------------ 签名

    private fun checkSignature(m: Materials): CheckResult {
        val rec = m.signature
            ?: return CheckResult(
                "signature", "签名验证", CheckStatus.SKIPPED,
                "本会话未签名（无签名记录）——不得声称已具备签名保障",
            )
        val pub = m.publicKeys[rec.keyId]
            ?: return CheckResult(
                "signature", "签名验证", CheckStatus.SKIPPED,
                "缺少 keyId=${rec.keyId} 的公钥，无法验证（验证材料不完整）",
            )
        return when (val r = SignatureVerifier.verify(rec, pub)) {
            is SignatureVerifier.Result.Valid -> CheckResult(
                "signature", "签名验证", CheckStatus.PASS,
                "签名有效（algorithm=${rec.algorithm}，keyId=${rec.keyId}）；" +
                    "仅说明该内容由对应私钥签署，不代表身份已获外部认证或内容真实",
            )
            is SignatureVerifier.Result.UnsupportedAlgorithm -> CheckResult(
                "signature", "签名验证", CheckStatus.FAIL, "不支持的签名算法：${r.algorithm}",
            )
            is SignatureVerifier.Result.InvalidPublicKey -> CheckResult(
                "signature", "签名验证", CheckStatus.FAIL, "公钥无法解析：${r.reason}",
            )
            is SignatureVerifier.Result.PayloadDigestMismatch -> CheckResult(
                "signature", "签名验证", CheckStatus.FAIL,
                "被签内容摘要不符（内容可能被改动）：期望 ${r.expected.take(12)}… 实际 ${r.actual.take(12)}…",
            )
            is SignatureVerifier.Result.InvalidSignature -> CheckResult(
                "signature", "签名验证", CheckStatus.FAIL, "签名无效：${r.reason}",
            )
        }
    }

    // -------------------------------------------------- 清单 ↔ 签名绑定

    /**
     * 清单与签名绑定（需求 §5.7「报告关键字段一致性」的强化）：
     * 签名对象覆盖的 `files` 摘要（相对路径 → SHA-256）必须与清单登记的每个文件哈希一致。
     *
     * 为什么必要：文件完整性检查比对的是**清单里的哈希**，而清单本身可被改动；
     * 只有与私钥签署过的 `signedPayload.files` 交叉核对，才能发现「清单与媒体被同时改写」。
     * 无签名或签名未通过时不提升本项（避免用坏签名背书清单）。
     */
    private fun checkSignatureFileBinding(m: Materials): CheckResult {
        val rec = m.signature
            ?: return CheckResult(
                "signature_file_binding", "清单与签名绑定", CheckStatus.SKIPPED,
                "本会话未签名，无法交叉核对清单",
            )
        val signedFiles = signedFilesOf(rec)
        if (signedFiles.isEmpty()) {
            return CheckResult(
                "signature_file_binding", "清单与签名绑定", CheckStatus.SKIPPED,
                "签名对象未包含文件摘要（无可核对内容）",
            )
        }
        // 按「文件名」归一（签名以完整相对路径为键，清单存文件名；包内不含子目录层级）
        val signedByBase = signedFiles.entries.associate { it.key.substringAfterLast('/') to it.value }
        val problems = mutableListOf<String>()
        for (f in m.files) {
            val base = f.relativePath.substringAfterLast('/')
            val signedHash = signedByBase[base]
            when {
                signedHash == null -> {
                    // 清单有、签名无：可能是签名后新增的登记（未纳入签名覆盖）——如实披露
                    problems += "$base：清单已登记但不在签名覆盖范围内"
                }
                f.sha256 == null -> problems += "$base：清单未记录哈希，无法与签名比对"
                signedHash != f.sha256 -> problems += "$base：清单哈希与签名摘要不符"
            }
        }
        return if (problems.isEmpty()) {
            CheckResult(
                "signature_file_binding", "清单与签名绑定", CheckStatus.PASS,
                "清单 ${m.files.size} 个文件哈希与签名对象摘要一致",
            )
        } else {
            CheckResult(
                "signature_file_binding", "清单与签名绑定", CheckStatus.FAIL,
                problems.joinToString("；"),
            )
        }
    }

    private fun signedFilesOf(rec: SignatureRecord): Map<String, String> {
        val el = rec.signedPayload["files"] ?: return emptyMap()
        val obj = el as? JsonObject ?: return emptyMap()
        return obj.entries.mapNotNull { (k, v) ->
            (v as? JsonPrimitive)?.takeIf { it.isString }?.content?.let { k to it }
        }.toMap()
    }
}
