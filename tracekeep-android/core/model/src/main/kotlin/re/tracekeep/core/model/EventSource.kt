package re.tracekeep.core.model

/**
 * 事件来源类型（需求 §4：每个事件标注来源类型，无法确认的事件不得写成确定事实）。
 */
enum class EventSource {
    /** 用户明确操作（点击开始/停止等）。 */
    USER_ACTION,

    /** 操作系统回调（权限撤销、系统中断、广播等）。 */
    SYSTEM_CALLBACK,

    /** 应用自身观察（如启动时发现的遗留状态）。 */
    APP_OBSERVATION,

    /** 第三方服务响应（时间戳/存证回执等；未接入服务时不应出现）。 */
    PROVIDER_RESPONSE,
}
