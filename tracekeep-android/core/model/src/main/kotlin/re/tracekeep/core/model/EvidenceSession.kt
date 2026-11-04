package re.tracekeep.core.model

import kotlinx.serialization.Serializable

/**
 * 会话记录（session.json 的持久化结构与运行时表示共用同一数据类）。
 *
 * 时间字段说明（需求 §4）：
 * - [createdAtWallMs]：设备墙上时钟（Unix 毫秒），非可信时间，仅记录事实；
 * - [createdAtMonoMs]：单调时钟（`System.nanoTime()` 毫秒），用于检测墙钟跳变，重启后归零；
 * - [stoppedAtWallMs]/[savedAtWallMs]：停止（封装完成）与本地保存完成时的墙上时钟；
 * - [sealedAtWallMs]：封存时的墙上时钟。
 *
 * 本地保存字段（停止即保存专项，格式版本 2 起）：
 * - [saveStatus] 为 null 表示尚未发生保存流程；SAVED 必须建立在文件已封装 + 完整性校验通过 + 记录已持久化之上；
 * - [saveErrorReason] 仅在 FAILED 时填写（人类可读、非推测性描述）。
 */
@Serializable
data class EvidenceSession(
    val formatVersion: Int = EvidenceFormat.VERSION,
    val sessionId: String,
    val recordingType: RecordingType,
    val state: SessionState,
    val createdAtWallMs: Long,
    val createdAtMonoMs: Long,
    val deviceSummary: Map<String, String> = emptyMap(),
    val stoppedAtWallMs: Long? = null,
    val savedAtWallMs: Long? = null,
    val saveStatus: SaveStatus? = null,
    val saveErrorReason: String? = null,
    val sealedAtWallMs: Long? = null,
    /** 封存时是否存在未完成或校验异常的文件（为 true 时导出与报告必须披露）。 */
    val sealedWithAnomalies: Boolean? = null,
)
