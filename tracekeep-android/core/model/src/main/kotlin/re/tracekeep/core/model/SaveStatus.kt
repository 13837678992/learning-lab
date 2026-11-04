package re.tracekeep.core.model

/**
 * 本地保存状态（会话级；需求「停止后直接保存」专项）。
 *
 * 语义边界（不得混淆）：
 * - null：尚未发生"停止并保存"流程（录制中、已放弃、或保存流程未完成）；
 * - [SAVED]：文件已封装完成 + 完整性校验通过 + 保存记录已持久化——**只有此时**才可向用户显示「保存成功」；
 * - [FAILED]：保存流程未完成（原因见 [EvidenceSession.saveErrorReason] 与事件日志）；
 *   录制文件保留（不删除），不得显示为保存成功。
 *
 * 注意：SAVED 仅表示「已存入本地证据库」，不代表内容真实、来源真实或任何法律效力。
 */
enum class SaveStatus {
    SAVED,
    FAILED,
}
