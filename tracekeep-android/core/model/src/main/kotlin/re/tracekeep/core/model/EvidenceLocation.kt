package re.tracekeep.core.model

import kotlinx.serialization.Serializable

/**
 * 定位采样记录（locations.jsonl：每行一个 JSON 对象）。
 * 仅记录设备实际提供的定位结果；定位缺失、权限撤销、无信号等情况以事件形式如实记录，
 * **不在此结构中补造坐标**（需求 §4）。
 */
@Serializable
data class EvidenceLocation(
    val formatVersion: Int = EvidenceFormat.VERSION,
    val seq: Long,
    val sessionId: String,
    val wallMs: Long,
    val monoMs: Long,
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float? = null,
    /** 定位来源（如 "gps"/"network"/"fused"；设备未提供时为 null）。 */
    val provider: String? = null,
)
