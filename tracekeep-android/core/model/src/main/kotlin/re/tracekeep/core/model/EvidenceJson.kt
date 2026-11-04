package re.tracekeep.core.model

import kotlinx.serialization.json.Json

/**
 * 证据文件的规范化 JSON 编码配置（单一来源）。
 * - encodeDefaults：显式写出默认值，保证同一数据结构的字节级可复现；
 * - ignoreUnknownKeys：读取未来版本新增字段时不失败（向前兼容）。
 * 数字一律使用 Long/Double 的原生 JSON 表示；字符编码固定 UTF-8（写入端负责）。
 */
object EvidenceJson {
    val instance: Json = Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
    }
}
