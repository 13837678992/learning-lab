package re.tracekeep.app.export

import android.content.Context
import android.net.Uri
import java.io.File
import re.tracekeep.app.signing.AndroidKeystoreSigner
import re.tracekeep.core.export.EvidenceManifest
import re.tracekeep.core.export.EvidencePackageBuilder
import re.tracekeep.core.integrity.Sha256
import re.tracekeep.core.storage.EvidenceStore
import re.tracekeep.core.verify.EvidenceVerifier

/**
 * 证据包导出（app 层；阶段 9）。
 *
 * 与"停止即保存"的边界（需求 §6 特别要求）：
 * - **本地保存**在录制停止时已独立完成（v0.1.2 起）；导出**不是**保存的前置条件；
 * - 本类只是把**已保存的本地证据**打包为可分发的证据包（含验证所需材料）；
 * - **导出不修改任何原始证据**（打包器只读源字节）。
 *
 * 数据流：EvidenceStore（本地证据库）→ SessionMaterial → EvidencePackageBuilder
 * → 目标目录（用户经 SAF 选择）→ 导出后复核（重读重算）。
 */
object EvidenceExporter {

    data class Result(val ok: Boolean, val message: String, val details: List<String> = emptyList())

    /**
     * 导出会话到 SAF 选定的**父目录**下的子目录（`TraceKeep-<sessionId 前 8 位>`）。
     * SAF 目录通过 DocumentFile 无法直接获得 java.nio.Path——因此采用**先打包到应用
     * 缓存目录，再逐文件复制到 SAF 目标**的两步方式（保证打包器可复用纯 JVM 实现）。
     */
    fun exportToSafTree(
        context: Context,
        store: EvidenceStore,
        sessionId: String,
        treeUri: Uri,
        appVersionName: String,
    ): Result {
        val staging = File(context.cacheDir, "export/${sessionId.take(8)}-${System.currentTimeMillis()}")
        return try {
            val material = loadMaterial(context, store, sessionId, appVersionName)
                ?: return Result(false, "会话不可读或不存在：$sessionId")
            // 1) 打包到缓存（纯 JVM 打包器）
            val result = EvidencePackageBuilder().build(material.material, staging.toPath())
            when (result) {
                is EvidencePackageBuilder.ExportResult.Failed -> Result(false, result.reason)
                is EvidencePackageBuilder.ExportResult.Success -> {
                    // 2) 复制到 SAF 目标（不覆盖同名文件——目标子目录已存在时另起唯一后缀）
                    val copied = copyTreeToSaf(context, staging, treeUri)
                    // 3) 复核**目标副本**（重读 SAF 内容重算 SHA-256，与清单比对）
                    val destCheck = verifySafDestination(context, copied.topUri, result.manifest)
                    return Result(
                        ok = result.verification.allMatch && destCheck.mismatches.isEmpty(),
                        message = when {
                            result.verification.allMatch && destCheck.mismatches.isEmpty() ->
                                "导出成功：${copied.count} 个文件（含 manifest.json / report.pdf / README.txt）"
                            else ->
                                "导出完成但复核存在不一致（打包 ${result.verification.mismatches.size} 项 / 目标 ${destCheck.mismatches.size} 项）——请检查"
                        },
                        details = listOf(
                            "复核：打包 ${result.verification.filesChecked} 项，目标重算 ${destCheck.checked} 项",
                            "包内含：manifest.json、report.pdf、README.txt、media/、logs/、signatures/、verification/",
                            "能力边界：本包不含第三方时间戳/存证；哈希与签名不代表内容真实或法院采信。",
                        ) + result.verification.mismatches.map { "！打包：$it" }
                            + destCheck.mismatches.map { "！目标：$it" },
                    )
                }
            }
        } catch (e: Exception) {
            Result(false, "导出异常：${e.message ?: e::class.simpleName}")
        } finally {
            staging.deleteRecursively()
        }
    }

    private data class LoadedMaterial(val material: EvidencePackageBuilder.SessionMaterial)

    private fun loadMaterial(
        context: Context,
        store: EvidenceStore,
        sessionId: String,
        appVersionName: String,
    ): LoadedMaterial? {
        return try {
            val session = store.loadSession(sessionId)
            val files = store.readSessionFiles(sessionId)
            val events = store.readSessionEvents(sessionId)
            val locations = store.readLocations(sessionId)
            val seal = runCatching { store.loadSeal(sessionId) }.getOrNull()
            val signature = store.loadSignatureRecord(sessionId)
            val keys = runCatching { AndroidKeystoreSigner(context).listKeys() }.getOrDefault(emptyList())
            val descriptor = signature?.let { sig -> keys.firstOrNull { it.keyId == sig.keyId } }
            LoadedMaterial(
                EvidencePackageBuilder.SessionMaterial(
                    session = session,
                    files = files,
                    events = events.events,
                    eventsSkippedLines = events.skippedLines,
                    locations = locations.locations,
                    locationsSkippedLines = locations.skippedLines,
                    seal = seal,
                    signature = signature,
                    publicKeyDescriptor = descriptor,
                    appVersionName = appVersionName,
                    fileBytes = { rel -> runCatching { store.readFileBytes(sessionId, rel) }.getOrNull() },
                ),
            )
        } catch (_: Exception) {
            null
        }
    }

    private data class SafCopyResult(val count: Int, val topUri: Uri?)

    /**
     * 将打包目录递归复制到 SAF 树，返回复制的文件数与**顶层包目录 URI**。
     *
     * **不覆盖同名**：若目标树下已存在同名 `TraceKeep-<id>` 目录，则创建带唯一后缀的兄弟目录
     * （而非写入既有目录）；文件层面同样只在**新建**的目录内创建，绝不截断已存在文件。
     */
    private fun copyTreeToSaf(context: Context, src: File, treeUri: Uri): SafCopyResult {
        val root = androidx.documentfile.provider.DocumentFile.fromTreeUri(context, treeUri)
            ?: return SafCopyResult(0, null)
        // 顶层：保证新目录（同名存在则加时间戳后缀，绝不并入既有目录）
        val top = root.createDirectory(src.name)
            ?: root.createDirectory("${src.name}-${System.currentTimeMillis()}")
            ?: return SafCopyResult(0, null)
        var count = 0
        fun copyInto(dir: androidx.documentfile.provider.DocumentFile, file: File) {
            if (file.isDirectory) {
                // 目录刚创建（顶层）或父目录刚创建，内部名不会与既有内容冲突
                val sub = dir.createDirectory(file.name) ?: return
                file.listFiles()?.forEach { copyInto(sub, it) }
            } else {
                val target = dir.createFile("application/octet-stream", file.name) ?: return
                context.contentResolver.openOutputStream(target.uri, "wt")?.use { out ->
                    file.inputStream().use { it.copyTo(out) }
                }
                count++
            }
        }
        src.listFiles()?.forEach { copyInto(top, it) }
        return SafCopyResult(count, top.uri)
    }

    /** 目标副本复核结果。 */
    private data class DestCheck(val checked: Int, val mismatches: List<String>)

    /**
     * 复核 SAF 目标副本：重读**目标目录内**每个媒体文件的字节并重算 SHA-256，与清单登记比对。
     * 这一步在「打包复核」之后执行，用于发现 SAF 写入本身的错误（传输截断、权限失败等）；
     * 任一不符 → 计入 mismatches，导出不得报告成功。
     */
    private fun verifySafDestination(
        context: Context,
        topUri: Uri?,
        manifest: EvidenceManifest,
    ): DestCheck {
        if (topUri == null) return DestCheck(0, listOf("目标目录创建失败"))
        val top = androidx.documentfile.provider.DocumentFile.fromTreeUri(context, topUri) ?: return DestCheck(0, listOf("目标目录不可读"))
        val media = top.findFile("media") ?: return DestCheck(0, listOf("目标缺少 media/ 目录"))
        val mismatches = mutableListOf<String>()
        var checked = 0
        for (entry in manifest.files) {
            val doc = media.findFile(entry.relativePath)
            if (doc == null) { mismatches += "media/${entry.relativePath}: 目标缺失"; continue }
            checked++
            val actual = runCatching {
                context.contentResolver.openInputStream(doc.uri)?.use { Sha256.of(it) }
            }.getOrNull()
            val expected = entry.sha256
            if (expected != null && actual != expected) {
                mismatches += "media/${entry.relativePath}: 目标哈希不符（清单 ${expected.take(12)}… 实际 ${actual?.take(12) ?: "读取失败"}）"
            }
        }
        return DestCheck(checked, mismatches)
    }
}
