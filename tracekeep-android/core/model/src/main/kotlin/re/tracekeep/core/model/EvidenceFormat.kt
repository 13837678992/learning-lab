package re.tracekeep.core.model

/**
 * 证据格式版本与全局常量。
 * 任何持久化结构（session.json / files.json / events.log / locations.jsonl / seal.json）都携带
 * [VERSION]，格式变更必须递增版本并在 `docs/` 中记录迁移说明。
 */
object EvidenceFormat {
    /**
     * 版本历史：
     * - v1：初始格式（session/files/events/locations/seal）；
     * - v2（2026-10-30）：EvidenceSession 新增本地保存字段（stoppedAtWallMs/savedAtWallMs/
     *   saveStatus/saveErrorReason）。**向后兼容**：v2 读取端可解析 v1（缺失字段为 null），
     *   写入端一律写 v2；无需数据迁移。
     */
    const val VERSION: Int = 2
}
