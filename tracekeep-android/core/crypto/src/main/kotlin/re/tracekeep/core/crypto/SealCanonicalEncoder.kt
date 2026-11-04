package re.tracekeep.core.crypto

import java.nio.charset.StandardCharsets
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import re.tracekeep.core.model.KeyDescriptor
import re.tracekeep.core.model.SignatureAlgorithm

/**
 * 签名对象（seal payload）的**版本化规范编码**（需求 §5：签名数据应有明确的版本与编码格式，
 * 为独立验证器提供稳定依据）。
 *
 * 被签内容（阶段 7 的签名对象 = 会话完整性摘要）：
 * - [SEAL_OBJECT_TYPE] / [SEAL_OBJECT_VERSION]：对象类型与版本（验证器据此选择解析规则）；
 * - [SigningPayload.chainHeadHash]：事件哈希链链尾哈希（覆盖整个事件序列）；
 * - [SigningPayload.eventsCount]：入链事件数；
 * - [SigningPayload.files]：文件清单摘要（相对路径 → SHA-256），按键名排序；
 * - [SigningPayload.appVersionName] / [SigningPayload.algorithm]：算法与应用版本信息。
 *
 * 编码纪律与 [re.tracekeep.core.integrity.CanonicalEncoding] 一致：
 * 固定字段顺序、键名字典序、UTF-8、长度前缀文本、显式空值标记。
 * **写入侧与独立验证器共用本实现**，任一方不得另行实现。
 */
object SealCanonicalEncoder {

    const val SEAL_OBJECT_TYPE: String = "seal"

    /** 签名对象版本；内容结构变化时递增（验证器据此判断兼容性）。 */
    const val SEAL_OBJECT_VERSION: Int = 1

    private const val NULL_MARKER = "~"

    /** 被签内容的语义结构（不含私钥；序列化为 [SignatureRecord.signedPayload]）。 */
    data class SigningPayload(
        val chainHeadHash: String?,
        val eventsCount: Int,
        val files: Map<String, String>,
        val appVersionName: String,
        val algorithm: SignatureAlgorithm,
        val keyId: String,
    ) {
        fun toJson(): JsonObject = JsonObject(
            buildMap {
                put("objectType", JsonPrimitive(SEAL_OBJECT_TYPE))
                put("objectVersion", JsonPrimitive(SEAL_OBJECT_VERSION))
                put("algorithm", JsonPrimitive(algorithm.name))
                put("keyId", JsonPrimitive(keyId))
                put("appVersionName", JsonPrimitive(appVersionName))
                put("eventsCount", JsonPrimitive(eventsCount))
                put("chainHeadHash", chainHeadHash?.let { JsonPrimitive(it) } ?: JsonPrimitive(""))
                put(
                    "files",
                    JsonObject(files.entries.sortedBy { it.key }
                        .associate { it.key to JsonPrimitive(it.value) }),
                )
            },
        )
    }

    /** 将签名载荷编码为确定性的 UTF-8 字节（供签名与验证双方使用）。 */
    fun encode(payload: SigningPayload): ByteArray = encodeJson(payload.toJson())

    /**
     * 对任意 `JsonObject` 载荷做确定性编码（验证器从落盘的 signedPayload 重算时使用）。
     * 键名一律字典序，嵌套对象/数组递归处理。
     */
    fun encodeJson(root: JsonObject): ByteArray {
        val sb = StringBuilder()
        sb.append("seal-v").append(SEAL_OBJECT_VERSION).append('\n')
        appendJsonObject(sb, root)
        return sb.toString().toByteArray(StandardCharsets.UTF_8)
    }

    private fun appendJsonObject(sb: StringBuilder, obj: JsonObject) {
        sb.append('{')
        obj.keys.sorted().forEachIndexed { i, key ->
            if (i > 0) sb.append(',')
            appendText(sb, key)
            sb.append(':')
            appendValue(sb, obj.getValue(key))
        }
        sb.append('}')
    }

    private fun appendValue(sb: StringBuilder, value: kotlinx.serialization.json.JsonElement) {
        when (value) {
            is kotlinx.serialization.json.JsonNull -> sb.append(NULL_MARKER)
            is JsonPrimitive -> if (value.isString) appendText(sb, value.content) else sb.append(value.content)
            is kotlinx.serialization.json.JsonArray -> {
                sb.append('[')
                value.forEachIndexed { i, c ->
                    if (i > 0) sb.append(',')
                    appendValue(sb, c)
                }
                sb.append(']')
            }
            is JsonObject -> appendJsonObject(sb, value)
        }
    }

    private fun appendText(sb: StringBuilder, value: String) {
        val bytes = value.toByteArray(StandardCharsets.UTF_8)
        sb.append(bytes.size).append(':').append(value)
    }
}
