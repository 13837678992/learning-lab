package re.tracekeep.core.model

/**
 * 标准事件类型常量（需求 §4 操作日志清单）。
 * 事件 type 使用字符串（而非枚举）以允许后续阶段追加类型；
 * 已定义的常量不得改名（持久化格式稳定性）。
 */
object EventTypes {
    const val SESSION_CREATED = "session_created"
    const val SESSION_STARTED = "session_started"
    const val SESSION_PAUSED = "session_paused"
    const val SESSION_RESUMED = "session_resumed"
    const val SESSION_STOPPED = "session_stopped"
    const val SESSION_ABORTED = "session_aborted"
    const val SESSION_SEALED = "session_sealed"

    const val FILE_REGISTERED = "file_registered"
    const val FILE_FINALIZED = "file_finalized"
    const val FILE_INCOMPLETE = "file_incomplete"

    /** 应用启动时观察到异常遗留状态（崩溃恢复）。仅记录观察到的事实，不推测原因。 */
    const val RECOVERY_OBSERVED = "recovery_observed"

    /** 录音配置（payload 中 requested=true 表示这是请求参数，非事后实测值）。 */
    const val RECORDING_CONFIG = "recording_config"

    /** 引擎控制动作失败（暂停/恢复不受支持或执行失败；如实记录失败本身）。 */
    const val ENGINE_ACTION_FAILED = "engine_action_failed"

    /** 录制引擎运行中报告错误（异步回调路径；录音被迫中断）。 */
    const val RECORDING_ENGINE_ERROR = "recording_engine_error"

    /** 引擎停止且容器封装完成（payload：durationMs、sha256、sizeBytes）。 */
    const val RECORDING_ENGINE_STOPPED = "recording_engine_stopped"

    /** 停止后尽力读回的实际媒体参数（payload：observed=true + 读回值；读回失败时 readable=false）。 */
    const val MEDIA_PARAMETERS_OBSERVED = "media_parameters_observed"

    /** 前后摄像头切换成功（payload：facing=back/front；失败走 ENGINE_ACTION_FAILED）。 */
    const val CAMERA_SWITCHED = "camera_switched"

    /** 视频水印配置（payload：enabled、timeSource="device_wall_clock"、timeZone、sessionLabel）。 */
    const val WATERMARK_CONFIGURED = "watermark_configured"

    /**
     * 水印绘制帧统计（停止后由控制器读取引擎计数并记录；payload：drawnFrames）。
     * drawnFrames=0 表示配置了水印但一帧未绘制，报告必须如实披露，不得声称视频含水印。
     */
    const val WATERMARK_FRAMES = "watermark_frames"

    /**
     * 本地保存完成（停止并保存专项；payload：fileId、sha256、sizeBytes、savedAtWallMs）。
     * 仅当文件已封装 + 完整性校验通过 + 会话保存记录已持久化后才写入本事件。
     */
    const val RECORDING_SAVED = "recording_saved"

    /**
     * 本地保存失败（payload：fileId[可选]、reason）。
     * 录制文件保留（不删除）；会话 saveStatus=FAILED 并记录原因，界面不得显示保存成功。
     */
    const val RECORDING_SAVE_FAILED = "recording_save_failed"

    /**
     * 观察到的时间异常（需求 §4；payload：kind、deltaMs、baselineOffsetMs、currentOffsetMs、
     * wallMs、monoMs）。
     *
     * 语义纪律：`kind` 是**可观察到的现象分类**（墙钟前跳/回拨/单调钟回退疑似），
     * **不是原因的断言**——不得据此写成"时间被篡改"等确定性结论。
     * 本事件由写入侧在**每条事件落盘前**比较 墙钟−单调钟 偏移而生成；
     * 它只覆盖"两次采样之间偏移突变"，无法发现同时篡改两个钟或采样间隔内的篡改。
     */
    const val TIME_ANOMALY_OBSERVED = "time_anomaly_observed"
}
