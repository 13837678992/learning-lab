package re.tracekeep.core.model

import kotlinx.serialization.Serializable

/**
 * 封存记录（seal.json）——封存时对会话材料的完整性快照。
 *
 * 能力边界（必须诚实表述，不得夸大）：
 * - 本记录是**本地防意外损坏/误改的检测基线**，不是可信时间证明；
 * - 在设备被完全控制（Root/恶意软件）的场景下，本记录可被整体重建（见 THREAT_MODEL F-2）；
 * - [eventsSha256]/[locationsSha256] 为对应文件的整体字节摘要；[files] 为逐文件哈希快照。
 */
@Serializable
data class SealRecord(
    val formatVersion: Int = EvidenceFormat.VERSION,
    val sessionId: String,
    val sealedAtWallMs: Long,
    val sealedAtMonoMs: Long,
    /** 封存前的会话状态（应为 STOPPED 或 ABORTED）。 */
    val sealedFromState: SessionState,
    /** 是否存在未完成或封存时校验异常的文件（true 时导出与报告必须披露）。 */
    val sealedWithAnomalies: Boolean,
    val files: List<SealFileEntry> = emptyList(),
    val eventsCount: Long,
    /** 封存时刻 events.log 中无法解析的行数（崩溃撕裂残行等；只披露，不修复）。 */
    val eventsSkippedLines: Long = 0,
    val eventsSha256: String? = null,
    val locationsCount: Long? = null,
    val locationsSkippedLines: Long = 0,
    val locationsSha256: String? = null,
)

@Serializable
data class SealFileEntry(
    val fileId: String,
    val relativePath: String,
    val lifecycle: FileLifecycle,
    /** 登记哈希（registry 中的值；未完成时为 null）。 */
    val sha256: String? = null,
    val sizeBytes: Long? = null,
    /** 封存时刻对该文件的实际校验结果（PASS/FAIL/MISSING/UNFINISHED/UNREADABLE）。 */
    val verification: VerificationStatus? = null,
)
