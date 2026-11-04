package re.tracekeep.core.recording

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import re.tracekeep.core.model.EventSource
import re.tracekeep.core.model.EventTypes
import re.tracekeep.core.model.FileRole
import re.tracekeep.core.model.RecordingType
import re.tracekeep.core.model.SessionState
import re.tracekeep.core.storage.EvidenceStore
import re.tracekeep.core.storage.RegisteredFile
import re.tracekeep.core.storage.SaveOutcome

/** 停止并保存流程的阶段（供 UI 如实显示：正在停止/封装/保存）。 */
enum class StopProgress { STOPPING, FINALIZING, SAVING }

/**
 * 录制编排控制器（录音/录像/录屏共用；纯 JVM，可用 Fake 引擎全路径单测）。
 *
 * 职责（需求 §3）：
 * - 用户明确发起才开始：控制器本身不自动启动任何录制；
 * - 会话状态机接线（CREATED→RECORDING→PAUSED↔RECORDING→STOPPED / ABORTED）；
 * - **多输出文件**：引擎通过 [RecordingEngine.outputFileNames] 声明本次会话的输出清单，
 *   控制器为每个输出登记独立 ORIGINAL 记录（如录屏 = 屏幕视频 + 内部音频 WAV 两条原始件），
 *   停止后逐一封装（封装完成再计算最终哈希，需求 §3）；
 * - 停止即保存（v0.1.2 起）：停止→封装→完整性复核→保存持久化；仅 [Result.Saved] 可显示"保存成功"；
 * - 异常处置全部进入追加式事件日志：引擎启动失败 / 异步引擎错误 / 暂停恢复不支持 /
 *   摄像头切换失败 / 用户取消（abort）；
 * - **异常或未完成文件不得标记为完整封存**：任何启动失败或中止都把**全部**输出文件标记 INCOMPLETE；
 * - 不声明任何法律效力：不保证内容真实、不保证法院采信。
 *
 * 请求参数 vs 观察参数（需求 §3）：[configPayload] 是**请求的**参数（事件标注 requested=true）；
 * 实际输出参数由 [MediaInspector] 停止后尽力读回（标注 observed=true）——两者绝不混同。
 *
 * 线程模型：控制器方法由调用方（UI 主线程或测试线程）串行调用；[onEngineError] 供
 * Android 层在异步回调中调用，内部仅记录事件并尽力中止（不触碰 Compose 状态）。
 */
class RecordingController private constructor(
    private val store: EvidenceStore,
    private val engine: RecordingEngine,
    private val recordingType: RecordingType,
    private val configPayload: JsonObject,
    private val deviceSummary: Map<String, String>,
    private val inspector: MediaInspector?,
) {

    private var sessionId: String? = null
    private var currentFiles: List<RegisteredFile> = emptyList()

    /** 主输出文件（第一个声明；保存流程以它为主校验对象）。 */
    private val primaryFile: RegisteredFile?
        get() = currentFiles.firstOrNull()

    /** 水印是否配置启用（由工厂按配置载荷判定；仅影响 WATERMARK_CONFIGURED 事件记录）。 */
    private val watermarkEnabled: Boolean =
        (configPayload["watermarkEnabled"] as? JsonPrimitive)?.content == "true"

    /** 当前会话 ID（未开始为 null）。 */
    val activeSessionId: String? get() = sessionId

    /** 会话创建时的设备墙上时间（水印「起录」时间使用；水印中显式标注为设备时间）。 */
    var startWallMs: Long = 0L
        private set

    /** 停止并保存流程的阶段回调（在调用线程触发；UI 层负责切主线程）。 */
    var onProgress: ((StopProgress) -> Unit)? = null

    /**
     * 开始录制。前置：无进行中的会话。
     * 失败情形（引擎拒绝启动，如内部音频在 API<29 不可用）：会话已创建，
     * **全部**输出文件如实标记 INCOMPLETE + 会话 ABORTED 并返回失败，绝不伪装成功。
     */
    fun start(): Result {
        check(sessionId == null) { "A recording session is already active" }

        val session = store.createSession(recordingType, deviceSummary)
        sessionId = session.sessionId
        startWallMs = session.createdAtWallMs
        store.appendEvent(
            session.sessionId,
            EventTypes.RECORDING_CONFIG,
            EventSource.APP_OBSERVATION,
            payload = configPayload,
        )
        if (watermarkEnabled) {
            store.appendEvent(
                session.sessionId,
                EventTypes.WATERMARK_CONFIGURED,
                EventSource.APP_OBSERVATION,
                payload = JsonObject(
                    mapOf(
                        "enabled" to JsonPrimitive(true),
                        // 时间来源固定为设备墙上时钟（显式标注，绝不宣称为可信时间戳）
                        "timeSource" to JsonPrimitive("device_wall_clock"),
                        "timeZone" to (configPayload["timeZone"] ?: JsonPrimitive("device")),
                        "sessionLabel" to JsonPrimitive(WatermarkTextFactory.shortSessionLabel(session.sessionId)),
                    ),
                ),
            )
        }

        val outputNames = engine.outputFileNames()
        if (outputNames.isEmpty()) {
            store.appendEvent(
                session.sessionId,
                EventTypes.ENGINE_ACTION_FAILED,
                EventSource.APP_OBSERVATION,
                payload = JsonObject(
                    mapOf("action" to JsonPrimitive("start"), "reason" to JsonPrimitive("engine declared no outputs")),
                ),
            )
            store.transition(session.sessionId, SessionState.ABORTED)
            return Result.StartFailed(session.sessionId, "engine declared no outputs")
        }
        val files = outputNames.map { name ->
            store.registerFile(session.sessionId, FileRole.ORIGINAL, name)
        }
        currentFiles = files

        val paths = outputNames.zip(files).associate { (name, file) -> name to file.absolutePath }
        when (val result = engine.start(paths)) {
            is EngineResult.Ok -> {
                store.transition(session.sessionId, SessionState.RECORDING)
                return Result.Started(
                    sessionId = session.sessionId,
                    fileId = files.first().fileId,
                    fileIds = files.map { it.fileId },
                )
            }
            is EngineResult.Failure -> {
                for (f in files) {
                    runCatching {
                        store.markFileIncomplete(session.sessionId, f.fileId, "engine start failed: ${result.reason}")
                    }
                }
                recordEngineActionFailure(session.sessionId, "start", result.reason)
                store.transition(session.sessionId, SessionState.ABORTED)
                currentFiles = emptyList()
                return Result.StartFailed(session.sessionId, result.reason)
            }
        }
    }

    /** 暂停（引擎不支持或失败时如实记录，不改变会话状态）。 */
    fun pause(): Result {
        val sessionId = requireActive()
        return when (val result = engine.pause()) {
            is EngineResult.Ok -> {
                store.transition(sessionId, SessionState.PAUSED)
                Result.Paused(sessionId)
            }
            is EngineResult.Failure -> {
                recordEngineActionFailure(sessionId, "pause", result.reason)
                Result.ActionFailed(sessionId, "pause", result.reason)
            }
        }
    }

    /** 恢复。 */
    fun resume(): Result {
        val sessionId = requireActive()
        return when (val result = engine.resume()) {
            is EngineResult.Ok -> {
                store.transition(sessionId, SessionState.RECORDING)
                Result.Resumed(sessionId)
            }
            is EngineResult.Failure -> {
                recordEngineActionFailure(sessionId, "resume", result.reason)
                Result.ActionFailed(sessionId, "resume", result.reason)
            }
        }
    }

    /**
     * 切换前后摄像头（仅录像会话有意义；失败如实记录，不改变录制状态）。
     * 成功时记录 CAMERA_SWITCHED（payload：facing），供事后核对录制过程中发生过切换。
     */
    fun switchCamera(): Result {
        val sessionId = requireActive()
        return when (val result = engine.switchCamera()) {
            is EngineResult.Ok -> {
                store.appendEvent(
                    sessionId,
                    EventTypes.CAMERA_SWITCHED,
                    EventSource.USER_ACTION,
                    payload = JsonObject(mapOf("facing" to JsonPrimitive(engine.currentCameraFacing()))),
                )
                Result.CameraSwitched(sessionId, engine.currentCameraFacing())
            }
            is EngineResult.Failure -> {
                recordEngineActionFailure(sessionId, "switch_camera", result.reason)
                Result.ActionFailed(sessionId, "switch_camera", result.reason)
            }
        }
    }

    /**
     * 用户主动停止 → **直接保存到本地证据库**（v0.1.2 起）。
     * 流程：引擎停止（容器封装完成）→ 逐一 finalizeFile（流式 SHA-256 + 大小）→
     * 会话 STOPPED（记录停止时间）→ completeRecordingSave（重算校验 + 保存事件 + 记录持久化）。
     *
     * 结果语义（调用方必须区分，不得混同）：
     * - [Result.Saved]：主输出封装完成 **且** 全部已封装文件校验通过 **且** 保存记录已持久化；
     * - [Result.SaveFailed]：封装完成但保存未完成（原因如实返回；**录制文件保留**，不删除）；
     * - [Result.StopFailed]：引擎停止失败 → 全部输出如实标记 INCOMPLETE + 会话 ABORTED。
     */
    fun stop(): Result {
        val sessionId = requireActive()
        val files = currentFiles
        val primary = files.firstOrNull() ?: error("No registered file for active session")
        onProgress?.invoke(StopProgress.STOPPING)
        return when (val result = engine.stop()) {
            is EngineResult.Ok -> {
                onProgress?.invoke(StopProgress.FINALIZING)
                // 逐一封装；单个文件封装失败时如实标记 INCOMPLETE（不掩蔽、不删除），
                // 由保存流程的严格校验决定最终保存结果。
                val finalized = files.map { f ->
                    runCatching { store.finalizeFile(sessionId, f.fileId) }
                        .getOrElse { e ->
                            runCatching {
                                store.markFileIncomplete(
                                    sessionId, f.fileId,
                                    "finalize failed: ${e.message ?: e::class.simpleName}",
                                )
                            }
                            store.listFiles(sessionId).first { it.fileId == f.fileId }
                        }
                }
                val primaryFinal = finalized.first { it.fileId == primary.fileId }
                store.appendEvent(
                    sessionId,
                    EventTypes.RECORDING_ENGINE_STOPPED,
                    EventSource.APP_OBSERVATION,
                    payload = JsonObject(
                        buildMap {
                            put("fileId", JsonPrimitive(primaryFinal.fileId))
                            primaryFinal.sha256?.let { put("sha256", JsonPrimitive(it)) }
                            primaryFinal.sizeBytes?.let { put("sizeBytes", JsonPrimitive(it)) }
                            put("outputCount", JsonPrimitive(finalized.size))
                        },
                    ),
                )
                recordObservedMediaParameters(sessionId, primary)
                // 水印绘制计数：仅录像引擎返回非 null；0 表示一帧未绘制（如实披露）
                engine.watermarkFramesDrawn()?.let { frames ->
                    store.appendEvent(
                        sessionId,
                        EventTypes.WATERMARK_FRAMES,
                        EventSource.APP_OBSERVATION,
                        payload = JsonObject(mapOf("drawnFrames" to JsonPrimitive(frames))),
                    )
                }
                store.transition(sessionId, SessionState.STOPPED)
                onProgress?.invoke(StopProgress.SAVING)
                val outcome = store.completeRecordingSave(sessionId, primaryFinal.fileId)
                currentFiles = emptyList()
                when (outcome) {
                    is SaveOutcome.Saved -> Result.Saved(
                        sessionId = sessionId,
                        fileId = primaryFinal.fileId,
                        sha256 = primaryFinal.sha256,
                        sizeBytes = primaryFinal.sizeBytes,
                        savedAtWallMs = outcome.session.savedAtWallMs,
                        incompleteFileIds = outcome.incompleteFileIds,
                    )
                    is SaveOutcome.Failed -> Result.SaveFailed(
                        sessionId = sessionId,
                        fileId = primaryFinal.fileId,
                        sha256 = primaryFinal.sha256,
                        sizeBytes = primaryFinal.sizeBytes,
                        reason = outcome.reason,
                    )
                }
            }
            is EngineResult.Failure -> {
                for (f in files) {
                    runCatching {
                        store.markFileIncomplete(sessionId, f.fileId, "engine stop failed: ${result.reason}")
                    }
                }
                recordEngineActionFailure(sessionId, "stop", result.reason)
                store.transition(sessionId, SessionState.ABORTED)
                currentFiles = emptyList()
                Result.StopFailed(sessionId, result.reason)
            }
        }
    }

    /**
     * 用户取消（放弃本次录制）。引擎尽力释放；全部输出文件如实标记 INCOMPLETE；
     * 会话进入 ABORTED。已有字节不删除（保全原始材料，供审计）。
     */
    fun abortUserCancelled(): Result {
        val sessionId = requireActive()
        val files = currentFiles
        runCatching { engine.abort() }
        for (f in files) {
            runCatching { store.markFileIncomplete(sessionId, f.fileId, "cancelled by user") }
        }
        store.transition(sessionId, SessionState.ABORTED)
        currentFiles = emptyList()
        return Result.Aborted(sessionId, "cancelled by user")
    }

    /**
     * 录制过程中引擎报告异步错误（Android 层回调入口；如权限被撤销、设备中断、系统停止录屏）。
     * 行为：尽力中止引擎；全部输出 INCOMPLETE；会话 ABORTED；事件如实记录。
     * 本方法不触碰 UI 状态（调用方负责切回主线程刷新）。
     */
    fun onEngineError(reason: String) {
        val sessionId = sessionId ?: return
        val files = currentFiles
        if (files.isEmpty()) return
        runCatching { engine.abort() }
        for (f in files) {
            runCatching { store.markFileIncomplete(sessionId, f.fileId, "engine error: $reason") }
        }
        store.appendEvent(
            sessionId,
            EventTypes.RECORDING_ENGINE_ERROR,
            EventSource.SYSTEM_CALLBACK,
            payload = JsonObject(mapOf("reason" to JsonPrimitive(reason))),
        )
        val session = store.loadSession(sessionId)
        if (!session.state.isTerminal) {
            store.transition(sessionId, SessionState.ABORTED)
        }
        currentFiles = emptyList()
    }

    /** 权限撤销（系统回调路径；与引擎错误分开命名，便于日志审计区分来源场景）。 */
    fun onPermissionRevoked() {
        onEngineError("permission revoked (reported by system)")
    }

    // ---------------------------------------------------------------- 内部与结果模型

    private fun requireActive(): String = sessionId ?: error("No active recording session")

    private fun recordEngineActionFailure(sessionId: String, action: String, reason: String) {
        store.appendEvent(
            sessionId,
            EventTypes.ENGINE_ACTION_FAILED,
            EventSource.APP_OBSERVATION,
            payload = JsonObject(
                mapOf("action" to JsonPrimitive(action), "reason" to JsonPrimitive(reason)),
            ),
        )
    }

    /**
     * 尽力读回主输出的实际媒体参数（观察值）。失败只记录 readable=false，不影响停止流程；
     * 读回字段全部标注 observed=true，与请求参数（requested=true）区分（需求 §3）。
     */
    private fun recordObservedMediaParameters(sessionId: String, file: RegisteredFile) {
        val mediaInspector = inspector ?: return
        val payload = try {
            val observed = mediaInspector.inspect(file.absolutePath)
            JsonObject(
                buildMap {
                    put("observed", JsonPrimitive(true))
                    put("fileId", JsonPrimitive(file.fileId))
                    for ((key, value) in observed) put(key, JsonPrimitive(value))
                },
            )
        } catch (e: Exception) {
            JsonObject(
                mapOf(
                    "observed" to JsonPrimitive(true),
                    "fileId" to JsonPrimitive(file.fileId),
                    "readable" to JsonPrimitive(false),
                    "reason" to JsonPrimitive(e.message ?: e::class.simpleName.orEmpty()),
                ),
            )
        }
        store.appendEvent(sessionId, EventTypes.MEDIA_PARAMETERS_OBSERVED, EventSource.APP_OBSERVATION, payload)
    }

    /** 统一结果模型：调用方必须区分成功与各类失败，报告与 UI 不得把失败显示为成功。 */
    sealed interface Result {
        val sessionId: String

        data class Started(
            override val sessionId: String,
            val fileId: String,
            val fileIds: List<String> = listOf(fileId),
        ) : Result

        data class StartFailed(override val sessionId: String, val reason: String) : Result

        data class Paused(override val sessionId: String) : Result
        data class Resumed(override val sessionId: String) : Result
        data class CameraSwitched(override val sessionId: String, val facing: String) : Result
        data class ActionFailed(override val sessionId: String, val action: String, val reason: String) : Result

        /**
         * 封装完成 + 校验通过 + 保存持久化成功（唯一可显示「保存成功」的结果）。
         * [incompleteFileIds] 非空表示存在未封装成功的次级输出（如内部音频轨）——
         * 这些文件保持 INCOMPLETE 且界面/报告必须披露。
         */
        data class Saved(
            override val sessionId: String,
            val fileId: String,
            val sha256: String?,
            val sizeBytes: Long?,
            val savedAtWallMs: Long?,
            val incompleteFileIds: List<String> = emptyList(),
        ) : Result

        /** 封装完成但保存未完成（录制文件保留；原因如实展示，不得显示保存成功）。 */
        data class SaveFailed(
            override val sessionId: String,
            val fileId: String,
            val sha256: String?,
            val sizeBytes: Long?,
            val reason: String,
        ) : Result

        data class StopFailed(override val sessionId: String, val reason: String) : Result
        data class Aborted(override val sessionId: String, val reason: String) : Result
    }

    companion object {

        /** 录音会话控制器。 */
        fun forAudio(
            store: EvidenceStore,
            engine: RecordingEngine,
            config: AudioRecordingConfig,
            deviceSummary: Map<String, String> = emptyMap(),
            inspector: MediaInspector? = null,
        ): RecordingController = RecordingController(
            store = store,
            engine = engine,
            recordingType = RecordingType.AUDIO,
            configPayload = JsonObject(
                mapOf(
                    "requested" to JsonPrimitive(true),
                    "kind" to JsonPrimitive("audio"),
                    "codec" to JsonPrimitive(config.codec),
                    "container" to JsonPrimitive(config.container),
                    "sampleRateHz" to JsonPrimitive(config.sampleRateHz),
                    "channelCount" to JsonPrimitive(config.channelCount),
                    "bitRateBps" to JsonPrimitive(config.bitRateBps),
                    "locationEnabled" to JsonPrimitive(config.locationEnabled),
                ),
            ),
            deviceSummary = deviceSummary,
            inspector = inspector,
        )

        /** 摄像头录像会话控制器。 */
        fun forVideo(
            store: EvidenceStore,
            engine: RecordingEngine,
            config: VideoRecordingConfig,
            deviceSummary: Map<String, String> = emptyMap(),
            inspector: MediaInspector? = null,
        ): RecordingController = RecordingController(
            store = store,
            engine = engine,
            recordingType = RecordingType.CAMERA_VIDEO,
            configPayload = JsonObject(
                mapOf(
                    "requested" to JsonPrimitive(true),
                    "kind" to JsonPrimitive("camera_video"),
                    "targetQuality" to JsonPrimitive(config.targetQuality),
                    "audioEnabled" to JsonPrimitive(config.audioEnabled),
                    "watermarkEnabled" to JsonPrimitive(config.watermarkEnabled),
                    "timeZone" to JsonPrimitive(config.watermarkTimeZoneId),
                    "locationEnabled" to JsonPrimitive(config.locationEnabled),
                ),
            ),
            deviceSummary = deviceSummary,
            inspector = inspector,
        )

        /** 屏幕录制会话控制器（需求 §3 录屏：每次会话重新授权；麦克风与内部音频分开处理）。 */
        fun forScreen(
            store: EvidenceStore,
            engine: RecordingEngine,
            config: ScreenRecordingConfig,
            deviceSummary: Map<String, String> = emptyMap(),
            inspector: MediaInspector? = null,
        ): RecordingController = RecordingController(
            store = store,
            engine = engine,
            recordingType = RecordingType.SCREEN,
            configPayload = JsonObject(
                mapOf(
                    "requested" to JsonPrimitive(true),
                    "kind" to JsonPrimitive("screen"),
                    "targetQuality" to JsonPrimitive(config.targetQuality),
                    "audioSource" to JsonPrimitive(config.audioSource.name),
                    "locationEnabled" to JsonPrimitive(config.locationEnabled),
                ),
            ),
            deviceSummary = deviceSummary,
            inspector = inspector,
        )
    }
}
