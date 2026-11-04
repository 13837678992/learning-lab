package re.tracekeep.core.model

import kotlinx.serialization.Serializable

/**
 * 证据文件登记记录（files.json 的条目）。
 *
 * 规则（需求 §5）：
 * - [relativePath] 必须是会话目录内的相对路径，且位于 `media/`（ORIGINAL）或 `derived/`（DERIVED）；
 * - [sha256] 为 null 表示尚未封装完成（生命周期 REGISTERED/INCOMPLETE），不得把它当作「哈希通过」；
 * - DERIVED 文件必须填写 [derivedFromFileId] 指向原始文件；ORIGINAL 必须为 null。
 */
@Serializable
data class EvidenceFile(
    val formatVersion: Int = EvidenceFormat.VERSION,
    val fileId: String,
    val sessionId: String,
    val relativePath: String,
    val role: FileRole,
    val derivedFromFileId: String? = null,
    val lifecycle: FileLifecycle,
    val createdWallMs: Long,
    val sizeBytes: Long? = null,
    val sha256: String? = null,
    val finalizedWallMs: Long? = null,
    /** 未完成或异常原因（人类可读；不得写入推测性内容）。 */
    val note: String? = null,
)
