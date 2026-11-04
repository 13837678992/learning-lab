package re.tracekeep.core.integrity

import java.nio.charset.StandardCharsets
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import re.tracekeep.core.model.EvidenceEvent

/**
 * 事件哈希输入的**版本化规范化编码**（需求 §5：定义字符编码、字段顺序、空值、数字、
 * 时区与哈希算法，避免字段顺序/格式差异造成验证不一致）。
 *
 * 设计原则：
 * - **确定性**：同一逻辑内容 → 同一字节序列（与 JSON 库的实现细节、字段声明顺序无关）；
 * - **版本化**：编码以 [ENCODING_VERSION] 前缀标识，未来规则变更必须升版本号
 *   （旧版本编码逻辑保留，验证器按事件携带的版本选择对应算法）；
 * - **显式字段顺序**：按固定字段名列表顺序编码，未知字段按名字典序追加（向前兼容且确定）；
 * - **显式空值**：null 编码为固定标记 `~`（JSON null 与"字段缺失"在编码层面区分）；
 * - **数字**：整数一律十进制字符串（Long 语义）；不做浮点（事件不含浮点字段）；
 * - **时间**：以 UTC 毫秒整数记录（不做本地时区格式化——避免时区相关不确定性）；
 * - **文本**：UTF-8 字节；以「长度前缀 + 原始字节」编码（避免分隔符注入歧义）；
 * - **哈希算法**：固定 SHA-256（见 [HashChain.ALGORITHM]）。
 *
 * 本文件是**写入侧与独立验证器（阶段 10）共用的唯一权威编码实现**——
 * 任何一方不得另行实现编码，否则验证将失效。
 */
object CanonicalEncoding {

    /** 规范编码版本；编码规则变更时递增，且必须保留旧版本实现以便验证历史数据。 */
    const val ENCODING_VERSION: Int = 1

    /** Long 空值标记（与 JSON null 对应）。 */
    private const val NULL_MARKER = "~"

    /** 事件参与哈希的字段顺序（固定；新增字段必须追加到末尾并升 [ENCODING_VERSION]）。 */
    private val EVENT_FIELD_ORDER = listOf(
        "seq",
        "sessionId",
        "wallMs",
        "monoMs",
        "type",
        "source",
        "payload",
        "prevHash",
    )

    /**
     * 将事件编码为其哈希输入的 UTF-8 字节序列。
     * 注意：**不包含事件自身的 `hash` 字段**（否则自指）；包含 `prevHash`（链式绑定）。
     */
    fun encodeEvent(event: EvidenceEvent, encodingVersion: Int = ENCODING_VERSION): ByteArray {
        require(encodingVersion == ENCODING_VERSION) {
            "Unsupported canonical encoding version: $encodingVersion"
        }
        val sb = StringBuilder()
        sb.append("v").append(encodingVersion).append('\n')
        for (field in EVENT_FIELD_ORDER) {
            sb.append(field).append('=')
            when (field) {
                "seq" -> sb.append(event.seq)
                "sessionId" -> appendText(sb, event.sessionId)
                "wallMs" -> sb.append(event.wallMs)
                "monoMs" -> sb.append(event.monoMs)
                "type" -> appendText(sb, event.type)
                "source" -> appendText(sb, event.source.name)
                "payload" -> appendJson(sb, event.payload)
                "prevHash" -> appendNullableText(sb, event.prevHash)
                else -> error("unhandled field: $field")
            }
            sb.append('\n')
        }
        return sb.toString().toByteArray(StandardCharsets.UTF_8)
    }

    /** 文本：`<字节数>:<原始 UTF-8 字节>`（长度前缀消除分隔符歧义）。 */
    private fun appendText(sb: StringBuilder, value: String) {
        val bytes = value.toByteArray(StandardCharsets.UTF_8)
        sb.append(bytes.size).append(':').append(value)
    }

    private fun appendNullableText(sb: StringBuilder, value: String?) {
        if (value == null) sb.append(NULL_MARKER) else appendText(sb, value)
    }

    /** JSON 值：对象按键名**字典序**递归编码（与声明顺序无关），null 用固定标记。 */
    private fun appendJson(sb: StringBuilder, element: JsonElement) {
        when (element) {
            is JsonNull -> sb.append(NULL_MARKER)
            is JsonPrimitive -> {
                if (!element.isString) {
                    // 数字/布尔：直接取字面量（事件 payload 仅含字符串与整数）
                    sb.append(element.content)
                } else {
                    appendText(sb, element.content)
                }
            }
            is JsonArray -> {
                sb.append('[')
                element.forEachIndexed { i, child ->
                    if (i > 0) sb.append(',')
                    appendJson(sb, child)
                }
                sb.append(']')
            }
            is JsonObject -> {
                sb.append('{')
                // 键名按字典序（确定性，不依赖插入顺序）
                element.keys.sorted().forEachIndexed { i, key ->
                    if (i > 0) sb.append(',')
                    appendText(sb, key)
                    sb.append(':')
                    appendJson(sb, element.getValue(key))
                }
                sb.append('}')
            }
        }
    }
}
