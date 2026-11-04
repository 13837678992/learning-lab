package re.tracekeep.core.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/**
 * 追加式事件日志条目（events.log：每行一个 JSON 对象）。
 *
 * - [seq]：会话内从 1 开始的序号，只增不减；
 * - [wallMs]/[monoMs]：双时间源，跳变检测依赖两者差值（不覆盖历史，只新增）；
 * - [source]：来源类型；无法确认的事件不得写成确定事实（需求 §4）；
 * - [prevHash]/[hash]：哈希链字段，**阶段 7 启用**；在此之前写入 null，
 *   且不参与任何校验承诺（不得对外宣称链已生效）。
 *
 * 封存后的会话不得追加任何事件（不可变保全）。
 */
@Serializable
data class EvidenceEvent(
    val formatVersion: Int = EvidenceFormat.VERSION,
    val seq: Long,
    val sessionId: String,
    val wallMs: Long,
    val monoMs: Long,
    val type: String,
    val source: EventSource,
    val payload: JsonObject = JsonObject(emptyMap()),
    val prevHash: String? = null,
    val hash: String? = null,
)
