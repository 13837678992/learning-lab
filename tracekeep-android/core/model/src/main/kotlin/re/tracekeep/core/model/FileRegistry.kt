package re.tracekeep.core.model

import kotlinx.serialization.Serializable

/**
 * 文件登记表（files.json 的持久化结构）。
 * 所有条目共享同一 formatVersion；写入端负责整体原子替换。
 */
@Serializable
data class FileRegistry(
    val formatVersion: Int = EvidenceFormat.VERSION,
    val files: List<EvidenceFile> = emptyList(),
)
