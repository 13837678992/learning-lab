package re.tracekeep.app.recording

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.camera.view.PreviewView
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.LifecycleOwner
import java.time.ZoneId
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import re.tracekeep.core.model.EventSource
import re.tracekeep.core.model.EventTypes
import re.tracekeep.core.model.SessionState
import re.tracekeep.core.recording.AudioRecordingConfig
import re.tracekeep.core.recording.EngineResult
import re.tracekeep.core.recording.LocationSnapshot
import re.tracekeep.core.recording.RecordingController
import re.tracekeep.core.recording.VideoRecordingConfig
import re.tracekeep.core.recording.WatermarkTextFactory
import re.tracekeep.core.storage.EvidenceStore
import re.tracekeep.core.storage.StorageException

/** 录制模式（UI 选择；阶段 4 摄像头录像；阶段 5 屏幕录制）。 */
enum class RecordingMode { AUDIO, CAMERA, SCREEN }

/**
 * 异步操作阶段（问题二：状态提示不得把"未成功启动"显示为"正在录制"，
 * 也不得把"保存中"显示为"空闲"）。
 * IDLE 空闲；STARTING 初始化/启动中；SAVING 停止与保存封装中（含等待编码器 Finalize）。
 */
enum class PendingOp { IDLE, STARTING, SAVING }

/** 停止并保存的结果信息（供界面显示保存成功/失败详情）。 */
data class SaveResultInfo(
    val sessionId: String,
    val saved: Boolean,
    val detail: String,
)

/** 证据库列表条目（只读展示；不可读会话以 UNREADABLE 如实呈现）。 */
data class LibraryRecord(
    val sessionId: String,
    val recordingType: String,
    val state: String,
    val saveStatus: String?,
    val saveErrorReason: String?,
    val createdAtWallMs: Long,
    val savedAtWallMs: Long?,
    val fileName: String?,
    val sizeBytes: Long?,
    val sha256: String?,
    val verification: String?,
)

/**
 * 录制会话持有器（app 层单例；落实 EvidenceStore 的「单进程所有权」约定）。
 *
 * 线程模型：
 * - 所有控制器操作（start/stop/pause/resume/abort/switchCamera）串行派发到单一后台线程
 *   `ops`（录像 stop 需等待容器封装事件，最长 15 秒，不得阻塞主线程；存储访问也因此串行化）；
 * - 结果一律 `main.post` 回主线程后更新 Compose 状态与提示文案；
 * - 引擎异步错误回调（任意线程）只转交控制器记录，再回主线程刷新状态；
 * - 计时器使用挂钟差值（暂停时冻结），仅作界面提示——**不是可信时间**。
 *
 * 诚实性约束：
 * - 录像模式下必须已绑定相机预览才能开始（避免任何「隐蔽录制」观感）；
 * - 录制中切换摄像头由引擎如实返回 Failure 并被记录（本实现不改写既有录制文件）；
 * - 启动失败 / 引擎错误 / 停止失败均如实展示，绝不显示为成功；
 * - 正在录制时禁止切换录音/录像模式（先停止），防止重复实例与状态错乱。
 */
// StaticFieldLeak：此单例只持有 applicationContext（见 init），引擎/采样器生命周期与进程一致，不构成 Activity 泄漏。
@android.annotation.SuppressLint("StaticFieldLeak")
object RecordingSessionHolder {

    private val ops: ExecutorService =
        Executors.newSingleThreadExecutor { r ->
            Thread(r, "tracekeep-recording-ops").apply {
                // 后台操作线程绝不因未捕获异常杀死进程：记录后可继续处理后续任务。
                // （会话内部状态由控制器负责如实标记；此处仅兜底防崩溃。）
                setUncaughtExceptionHandler { _, e ->
                    main.post {
                        lastMessage.value = "后台操作异常：${e.message ?: e::class.simpleName}（已记录；请检查会话状态）"
                        pendingOp.value = PendingOp.IDLE
                    }
                }
            }
        }
    private val main = Handler(Looper.getMainLooper())
    private val timerScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private var appContext: Context? = null
    private var store: EvidenceStore? = null
    private var controller: RecordingController? = null
    private var videoEngine: CameraXVideoEngine? = null
    private var locationSampler: LocationSampler? = null

    /** 录屏模式：MediaProjection 授权令牌（由 UI 的授权 Activity 回调注入；仅本次会话有效）。 */
    private var screenProjection: android.media.projection.MediaProjection? = null

    /** 录屏：服务是否已先行启动（Android 14+ 顺序：先起 mediaProjection 前台服务，再取令牌）。 */
    private var screenProjectionActive = false

    /** 录屏音频来源（UI 选择；默认麦克风）。 */
    val screenAudioSource = mutableStateOf(re.tracekeep.core.recording.ScreenAudioSource.MICROPHONE)
    private var timerJob: Job? = null

    /** 当前会话状态（null = 无会话）。 */
    val sessionState = mutableStateOf<SessionState?>(null)

    /** 当前会话 ID（null = 无会话）。 */
    val sessionId = mutableStateOf<String?>(null)

    /** 当前异步操作阶段（STARTING/SAVING 期间禁用按钮，防连点）。 */
    val pendingOp = mutableStateOf(PendingOp.IDLE)

    /** 最近一次操作的人类可读结果（如实展示成功/失败）。 */
    val lastMessage = mutableStateOf<String?>(null)

    /** 最近一次停止后封装文件的重算校验结果（如 "PASS"）。 */
    val lastVerification = mutableStateOf<String?>(null)

    /** 最近一次"停止并保存"的结果（保存成功/失败详情；供界面如实展示）。 */
    val saveResult = mutableStateOf<SaveResultInfo?>(null)

    /** 当前/最近会话的保存状态（"SAVED"/"FAILED"；来自持久化会话记录，重启后仍可显示）。 */
    val saveStatus = mutableStateOf<String?>(null)

    /** 保存失败原因（仅 FAILED 时有值）。 */
    val saveErrorReason = mutableStateOf<String?>(null)

    /** 停止并保存流程的当前阶段（"正在停止"/"正在封装"/"正在保存"；null=未进行）。 */
    val stopPhase = mutableStateOf<String?>(null)

    /** 摄像头朝向（"back"/"front"；录像开始前可切换）。 */
    val cameraFacing = mutableStateOf("back")

    /** 录制计时显示（"mm:ss" 或 "h:mm:ss"；基于挂钟差值，暂停冻结；仅界面提示用途）。 */
    val elapsedDisplay = mutableStateOf("00:00")

    /** 是否随会话记录定位（用户开关；默认关闭，开启时申请「使用中」定位权限）。 */
    val locationEnabled = mutableStateOf(false)

    /**
     * 视频水印开关（默认开启；水印写入最终视频文件，见 WatermarkOverlayRenderer）。
     * 可在录制前关闭——部分环境（如软件 GL 模拟器、个别低端设备）水印 GL 管线
     * 可能导致视频编码器馈帧不足（Finalize ERROR_NO_VALID_DATA）；关闭后为无水晶录像，
     * 事件日志如实记录 watermarkEnabled=false，报告不得声称含水印。
     */
    val watermarkEnabled = mutableStateOf(true)

    /** 当前定位状态（供界面与说明展示；水印渲染器直接读取 [LocationSampler.current]）。 */
    val locationState = mutableStateOf(LocationSnapshot.DISABLED)

    /** 当前 UI 模式（录像模式需要相机预览；退出模式时由 UI 调用 detachPreview）。 */
    val currentMode = mutableStateOf(RecordingMode.AUDIO)

    private var timerBaseWallMs = 0L
    private var timerPausedTotalMs = 0L
    private var timerPauseStartedAt = 0L

    private val audioConfig: AudioRecordingConfig
        get() = AudioRecordingConfig(
            codec = "AAC",
            container = "MPEG_4",
            sampleRateHz = 44_100,
            channelCount = 1,
            bitRateBps = 128_000,
            locationEnabled = locationEnabled.value,
        )

    private val videoConfig: VideoRecordingConfig
        get() = VideoRecordingConfig(
            targetQuality = "FHD",
            audioEnabled = true,
            cameraFacing = cameraFacing.value,
            watermarkEnabled = watermarkEnabled.value,
            watermarkTimeZoneId = ZoneId.systemDefault().id,
            locationEnabled = locationEnabled.value,
        )

    fun init(context: Context, store: EvidenceStore) {
        appContext = context.applicationContext
        this.store = store
        sessionState.value = null
        sessionId.value = null
        pendingOp.value = PendingOp.IDLE
    }

    val hasActiveSession: Boolean
        get() = sessionState.value?.let { !it.isTerminal } == true

    /** 是否正在录制（含暂停；用于阻止模式切换与重复启动）。 */
    val isRecordingActive: Boolean
        get() = sessionState.value == SessionState.RECORDING || sessionState.value == SessionState.PAUSED

    // ---------------------------------------------------------------- 相机预览

    /**
     * 绑定取景预览（幂等：同一 view 重复调用不重建引擎）。
     * 相机不可用（无权限/被占用）时如实显示提示，不进入录像流程。
     */
    fun attachPreview(owner: LifecycleOwner, view: PreviewView) {
        rememberPreviewContext(owner, view)
        if (videoEngine?.isAttachedTo(view) == true) return
        val ctx = appContext ?: return
        // 已有引擎但绑定到旧 view（Compose 重组/旋转）：沿用引擎重建绑定
        if (videoEngine == null) {
            videoEngine = CameraXVideoEngine(
                context = ctx,
                lifecycleOwner = owner,
                config = videoConfig,
                onError = { reason -> onEngineErrorFromCallback(reason) },
                watermarkRenderer = null, // 会话引擎在 startVideo 时重建（含水印渲染器）
            )
        }
        val engine = videoEngine ?: return
        ops.execute {
            val result = runCatching { engine.bindPreview(view) }
            result.onFailure { e ->
                main.post {
                    lastMessage.value = "相机预览不可用：${e.message ?: e::class.simpleName}"
                }
            }
        }
    }

    /** 解绑相机（离开录像界面时调用）。 */
    fun detachPreview() {
        val engine = videoEngine ?: return
        videoEngine = null
        clearPreviewContext()
        ops.execute { engine.unbindAll() }
    }

    // ---------------------------------------------------------------- 会话操作

    /**
     * 开始录制（模式由 UI 传入）。
     * 防连点：STARTING 期间再次调用直接忽略（不产生第二个会话）。
     */
    fun start(mode: RecordingMode) {
        val s = store ?: error("RecordingSessionHolder not initialized")
        if (pendingOp.value != PendingOp.IDLE) return
        if (controller != null || hasActiveSession) {
            lastMessage.value = "已有进行中的录制，请先停止或放弃"
            return
        }
        pendingOp.value = PendingOp.STARTING
        when (mode) {
            RecordingMode.AUDIO -> startAudio(s)
            RecordingMode.CAMERA -> startVideo(s)
            RecordingMode.SCREEN -> startScreen(s)
        }
    }

    private fun startAudio(s: EvidenceStore) {
        val ctx = appContext ?: error("not initialized")
        val engine = MediaRecorderEngine(ctx, audioConfig) { reason ->
            onEngineErrorFromCallback(reason)
        }
        val c = RecordingController.forAudio(
            store = s,
            engine = engine,
            config = audioConfig,
            deviceSummary = deviceSummary(),
            inspector = MediaOutputInspector(),
        )
        c.onProgress = { phase -> main.post { stopPhase.value = stopPhaseLabel(phase) } }
        controller = c
        ops.execute {
            val result = c.start()
            main.post {
                publishStart(s, result, includeCamera = false)
                if (result is RecordingController.Result.Started) {
                    startLocationSampling(s, result.sessionId)
                }
            }
        }
    }

    private fun startVideo(s: EvidenceStore) {
        val ctx = appContext ?: error("not initialized")
        val owner = videoLifecycleOwner
        if (owner == null || previewViewRef == null) {
            pendingOp.value = PendingOp.IDLE
            lastMessage.value = "相机未就绪（需要取景画面）；未开始录像"
            return
        }
        // 水印开关（videoConfig.watermarkEnabled）决定渲染器是否存在：
        // 关闭时 OverlayEffect 完全不上管线（不产生额外 GL 负载）。
        val renderer = if (videoConfig.watermarkEnabled) {
            WatermarkOverlayRenderer(
                zoneId = ZoneId.systemDefault(),
                nowWallMsProvider = { System.currentTimeMillis() },
                pausedProvider = { sessionState.value == SessionState.PAUSED },
                locationProvider = {
                    locationSampler?.current ?: LocationSnapshot.DISABLED
                },
            )
        } else {
            null
        }
        // 每次会话使用独立引擎实例：会话开始前的预览绑定（旧引擎）在此被替换；
        // 旧实例先解绑（不残留摄像头资源），新实例重建绑定后再启动录制。
        val previous = videoEngine
        val engine = CameraXVideoEngine(
            context = ctx,
            lifecycleOwner = owner,
            config = videoConfig,
            onError = { reason -> onEngineErrorFromCallback(reason) },
            watermarkRenderer = renderer,
            pausedProvider = { sessionState.value == SessionState.PAUSED },
        )
        videoEngine = engine

        val c = RecordingController.forVideo(
            store = s,
            engine = engine,
            config = videoConfig,
            deviceSummary = deviceSummary(),
            inspector = MediaOutputInspector(),
        )
        c.onProgress = { phase -> main.post { stopPhase.value = stopPhaseLabel(phase) } }
        controller = c
        ops.execute {
            previous?.let { runCatching { it.unbindAll() } }
            previewViewRef?.let { view ->
                runCatching { engine.bindPreview(view) }
                    .onFailure { e ->
                        main.post {
                            // 预览绑定失败：不进入录制流程（避免"无取景的隐蔽录制"）
                            controller = null
                            pendingOp.value = PendingOp.IDLE
                            lastMessage.value = "相机预览绑定失败：${e.message ?: e::class.simpleName}；未开始录像"
                        }
                    }
                    .getOrElse { return@execute }
            }
            val result = c.start()
            main.post {
                if (result is RecordingController.Result.Started) {
                    renderer?.bindSession(
                        sessionLabel = WatermarkTextFactory.shortSessionLabel(result.sessionId),
                        startWallMs = c.startWallMs,
                    )
                }
                publishStart(s, result, includeCamera = true)
                if (result is RecordingController.Result.Started) {
                    startLocationSampling(s, result.sessionId)
                }
            }
        }
    }

    /**
     * 录屏启动第一阶段：先启动 mediaProjection 类型前台服务（Android 14+ 顺序要求），
     * 然后由 UI 弹出系统授权对话框；授权令牌经 [onScreenProjectionGranted] 回调注入。
     * 用户拒绝授权 → 由 UI 调用 [onScreenProjectionDenied]（如实失败，不产生会话）。
     */
    fun startScreen(s: EvidenceStore) {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.Q &&
            screenAudioSource.value == re.tracekeep.core.recording.ScreenAudioSource.INTERNAL
        ) {
            pendingOp.value = PendingOp.IDLE
            lastMessage.value = "内部音频录制需要 Android 10+；请选择麦克风或无音频"
            return
        }
        if (screenAudioSource.value == re.tracekeep.core.recording.ScreenAudioSource.MICROPHONE) {
            val hasMic = androidx.core.content.ContextCompat.checkSelfPermission(
                appContext ?: return, android.Manifest.permission.RECORD_AUDIO,
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            if (!hasMic) {
                pendingOp.value = PendingOp.IDLE
                lastMessage.value = "麦克风权限未授予：无法以麦克风作为录屏音频；请在权限请求后重试或改选音频来源"
                return
            }
        }
        // 服务先行（14+ 令牌校验要求 mediaProjection FGS 已运行）
        appContext?.let {
            RecordingService.start(it, video = false, screen = true, withLocation = locationEnabled.value)
        }
        screenProjectionActive = true
        lastMessage.value = "等待系统录屏授权…"
    }

    /** 系统授权对话框结果（授权）：开始录屏会话。 */
    fun onScreenProjectionGranted(projection: android.media.projection.MediaProjection) {
        val s = store ?: return
        if (pendingOp.value != PendingOp.STARTING) {
            runCatching { projection.stop() }
            return
        }
        screenProjection = projection
        val ctx = appContext ?: return
        val engine = ScreenRecorderEngine(ctx, projection, screenConfig(), ::onEngineErrorFromCallback)
        val c = RecordingController.forScreen(
            store = s,
            engine = engine,
            config = screenConfig(),
            deviceSummary = deviceSummary(),
            inspector = MediaOutputInspector(),
        )
        c.onProgress = { phase -> main.post { stopPhase.value = stopPhaseLabel(phase) } }
        controller = c
        ops.execute {
            val result = c.start()
            main.post {
                publishStart(s, result, includeCamera = true, startLabel = "录屏已开始")
                if (result is RecordingController.Result.Started) {
                    startLocationSampling(s, result.sessionId)
                }
            }
        }
    }

    /** 系统授权对话框结果（拒绝）：如实失败；同时停掉先行启动的前台服务。 */
    fun onScreenProjectionDenied() {
        pendingOp.value = PendingOp.IDLE
        controller = null
        screenProjectionActive = false
        appContext?.let { RecordingService.stop(it) }
        lastMessage.value = "用户拒绝了系统录屏授权：未开始录屏"
    }

    private fun screenConfig(): re.tracekeep.core.recording.ScreenRecordingConfig =
        re.tracekeep.core.recording.ScreenRecordingConfig(
            audioSource = screenAudioSource.value,
            targetQuality = "FHD",
            locationEnabled = locationEnabled.value,
        )

    fun pause() {
        if (pendingOp.value != PendingOp.IDLE) return
        exec("已暂停", "暂停失败") { it.pause() }
        if (sessionState.value == SessionState.PAUSED) {
            timerPauseStartedAt = System.currentTimeMillis()
        }
    }

    fun resume() {
        if (pendingOp.value != PendingOp.IDLE) return
        exec("已继续", "继续失败") { it.resume() }
        if (sessionState.value == SessionState.RECORDING && timerPauseStartedAt > 0) {
            timerPausedTotalMs += System.currentTimeMillis() - timerPauseStartedAt
            timerPauseStartedAt = 0L
        }
    }

    fun stop() {
        if (pendingOp.value != PendingOp.IDLE) return
        pendingOp.value = PendingOp.SAVING
        stopPhase.value = "正在停止录制"
        saveResult.value = null
        exec("保存成功，已存入本地证据库", "保存流程未完成", finalizePending = true) { it.stop() }
        stopLocationSampling()
        appContext?.let { RecordingService.stop(it) }
        screenProjection = null
    }

    /**
     * 放弃本次录制（引擎释放；文件如实标记未完成并保留既有字节）。
     */
    fun abort() {
        if (pendingOp.value != PendingOp.IDLE) return
        pendingOp.value = PendingOp.SAVING
        exec("已放弃本次录制（材料保留并如实标记为未完成）", "放弃操作失败", finalizePending = true) {
            it.abortUserCancelled()
        }
        stopLocationSampling()
        appContext?.let { RecordingService.stop(it) }
        screenProjection = null
    }

    /**
     * 切换摄像头：
     * - 录制中：交给引擎（本实现如实返回不支持 → 记录失败事件，不改写当前录制）；
     * - 未录制（录像模式）：翻转预览朝向，供下一次录制使用。
     */
    fun switchCamera() {
        val c = controller
        if (c != null && hasActiveSession) {
            exec("已切换摄像头", "切换摄像头失败") { it.switchCamera() }
            return
        }
        val newFacing = if (cameraFacing.value == "back") "front" else "back"
        val engine = videoEngine
        if (engine == null) {
            cameraFacing.value = newFacing
            lastMessage.value = facingLabel(newFacing) + "已选择（相机就绪后生效）"
            return
        }
        ops.execute {
            val result = engine.setLensFacing(newFacing)
            main.post {
                when (result) {
                    is EngineResult.Ok -> {
                        cameraFacing.value = newFacing
                        lastMessage.value = facingLabel(newFacing) + "已启用"
                    }
                    is EngineResult.Failure -> {
                        lastMessage.value = "切换摄像头失败：${result.reason}"
                    }
                }
            }
        }
    }

    /** 用户开关位置记录（仅空闲时允许切换；录制中固定为本次会话开始时的值）。 */
    fun setLocationEnabled(enabled: Boolean) {
        if (isRecordingActive || pendingOp.value != PendingOp.IDLE) return
        locationEnabled.value = enabled
        if (!enabled) {
            locationState.value = LocationSnapshot.DISABLED
        }
    }

    /** 用户开关视频水印（仅空闲时允许切换；录制中固定为本次会话开始时的值）。 */
    fun setWatermarkEnabled(enabled: Boolean) {
        if (isRecordingActive || pendingOp.value != PendingOp.IDLE) return
        watermarkEnabled.value = enabled
    }

    /** 从磁盘刷新状态（进程重建后恢复显示）。 */
    fun refresh() {
        val s = store ?: return
        val id = sessionId.value ?: return
        val session = runCatching { s.loadSession(id) }.getOrNull() ?: return
        sessionState.value = session.state
        val status = session.saveStatus?.name
        if (!recordingInProgress() || saveStatus.value == null) {
            saveStatus.value = status
        }
        saveErrorReason.value = session.saveErrorReason
    }

    private fun recordingInProgress(): Boolean =
        sessionState.value == SessionState.RECORDING || sessionState.value == SessionState.PAUSED

    /**
     * 列出本地证据库中的已保存记录（供证据库查看界面，验证持久化）。
     * 只读扫描会话目录；损坏/不可读的会话以异常条目如实呈现，不隐藏。
     */
    fun listLibraryRecords(): List<LibraryRecord> {
        val s = store ?: return emptyList()
        return try {
            s.listSessionIds().mapNotNull { id ->
                runCatching {
                    val session = s.loadSession(id)
                    val file = s.listFiles(id).firstOrNull()
                    var verification: String? = null
                    if (file != null && session.state == SessionState.STOPPED) {
                        verification = runCatching { s.verifyFile(id, file.fileId).name }.getOrNull()
                    }
                    LibraryRecord(
                        sessionId = id,
                        recordingType = session.recordingType.name,
                        state = session.state.name,
                        saveStatus = session.saveStatus?.name,
                        saveErrorReason = session.saveErrorReason,
                        createdAtWallMs = session.createdAtWallMs,
                        savedAtWallMs = session.savedAtWallMs,
                        fileName = file?.relativePath?.substringAfterLast('/'),
                        sizeBytes = file?.sizeBytes,
                        sha256 = file?.sha256,
                        verification = verification,
                    )
                }.getOrElse {
                    LibraryRecord(
                        sessionId = id,
                        recordingType = "UNREADABLE",
                        state = "UNREADABLE",
                        saveStatus = null,
                        saveErrorReason = it.message,
                        createdAtWallMs = 0L,
                        savedAtWallMs = null,
                        fileName = null,
                        sizeBytes = null,
                        sha256 = null,
                        verification = null,
                    )
                }
            }.sortedByDescending { it.createdAtWallMs }
        } catch (_: StorageException) {
            emptyList()
        }
    }

    /** 退出录像模式时调用（清计时与定位）。 */
    fun leaveCameraMode() {
        if (hasActiveSession) return
        stopLocationSampling()
    }

    // ---------------------------------------------------------------- 定位

    private fun startLocationSampling(s: EvidenceStore, sessionId: String) {
        val ctx = appContext ?: return
        val sampler = LocationSampler(ctx)
        locationSampler?.stop()
        locationSampler = sampler
        sampler.onFix = { snap ->
            // 实际定位结果写入会话 locations.jsonl（仅当会话仍在录制中）
            val active = this.sessionId.value == sessionId && hasActiveSession
            if (active) {
                ops.execute {
                    runCatching {
                        s.appendLocation(
                            sessionId,
                            snap.latitude ?: return@runCatching,
                            snap.longitude ?: return@runCatching,
                            snap.accuracyMeters,
                            snap.provider,
                        )
                    }
                }
            }
        }
        main.post {
            sampler.start(locationEnabled.value)
            locationState.value = sampler.snapshot.value
        }
    }

    private fun stopLocationSampling() {
        val sampler = locationSampler ?: return
        sampler.onFix = null
        sampler.stop()
        locationState.value = LocationSnapshot.DISABLED
    }

    // ---------------------------------------------------------------- 内部

    private fun deviceSummary(): Map<String, String> = buildMap {
        put("manufacturer", Build.MANUFACTURER)
        put("model", Build.MODEL)
        put("sdkInt", Build.VERSION.SDK_INT.toString())
        put("deviceTimeZone", ZoneId.systemDefault().id)
    }

    private fun exec(
        successMessage: String,
        failurePrefix: String,
        finalizePending: Boolean = false,
        action: (RecordingController) -> RecordingController.Result,
    ) {
        val s = store ?: return
        val c = controller ?: run {
            pendingOp.value = PendingOp.IDLE
            lastMessage.value = "没有进行中的录制"
            return
        }
        ops.execute {
            val result = action(c)
            main.post {
                publishAction(s, result, successMessage, failurePrefix)
                if (finalizePending) {
                    stopPhase.value = null
                    if (pendingOp.value == PendingOp.SAVING) {
                        pendingOp.value = PendingOp.IDLE
                    }
                }
            }
        }
    }

    private fun publishStart(
        s: EvidenceStore,
        result: RecordingController.Result,
        includeCamera: Boolean,
        startLabel: String? = null,
    ) {
        when (result) {
            is RecordingController.Result.Started -> {
                sessionId.value = result.sessionId
                sessionState.value = s.loadSession(result.sessionId).state
                lastMessage.value = startLabel ?: if (includeCamera) "录像已开始" else "录音已开始"
                lastVerification.value = null
                saveResult.value = null
                saveStatus.value = null
                saveErrorReason.value = null
                pendingOp.value = PendingOp.IDLE
                // 注意：录屏（SCREEN）模式下前台服务已在 startScreen() 中先于令牌获取启动
                // （Android 14+ 顺序要求），此处不重复启动。
                if (screenProjectionActive) {
                    screenProjectionActive = false
                } else {
                    appContext?.let { RecordingService.start(it, includeCamera, locationEnabled.value) }
                }
                startTimer(result.sessionId)
            }
            is RecordingController.Result.StartFailed -> {
                sessionId.value = result.sessionId
                sessionState.value = s.loadSession(result.sessionId).state
                lastMessage.value = "录制启动失败：${result.reason}（会话已如实标记为中断）"
                controller = null
                pendingOp.value = PendingOp.IDLE
                stopTimer()
            }
            else -> {
                lastMessage.value = "启动出现未预期结果"
                controller = null
                pendingOp.value = PendingOp.IDLE
            }
        }
    }

    private fun publishAction(
        s: EvidenceStore,
        result: RecordingController.Result,
        successMessage: String,
        failurePrefix: String,
    ) {
        when (result) {
            is RecordingController.Result.Paused,
            is RecordingController.Result.Resumed,
            is RecordingController.Result.CameraSwitched,
            -> {
                lastMessage.value = successMessage
                sessionState.value = s.loadSession(result.sessionId).state
            }
            is RecordingController.Result.Saved -> {
                sessionState.value = s.loadSession(result.sessionId).state
                lastVerification.value = s.verifyFile(result.sessionId, result.fileId).name
                saveStatus.value = "SAVED"
                saveErrorReason.value = null
                lastMessage.value = if (lastVerification.value == "PASS") {
                    "保存成功，已存入本地证据库"
                } else {
                    // 保存流程完成后文件应当时刻可复核；此分支出现说明文件随后被外部改动——如实披露
                    "已保存，但复核校验为 ${lastVerification.value}：文件随后可能发生变化，请检查"
                }
                saveResult.value = SaveResultInfo(
                    sessionId = result.sessionId,
                    saved = true,
                    detail = "记录已持久化；SHA-256 ${result.sha256?.take(16) ?: "?"}…",
                )
                controller = null
                stopTimer()
            }
            is RecordingController.Result.SaveFailed -> {
                sessionState.value = s.loadSession(result.sessionId).state
                lastVerification.value = null
                saveStatus.value = "FAILED"
                saveErrorReason.value = result.reason
                lastMessage.value = "$failurePrefix（未保存）：${result.reason}；录制文件已保留，可在下次启动时重试保存"
                saveResult.value = SaveResultInfo(
                    sessionId = result.sessionId,
                    saved = false,
                    detail = result.reason,
                )
                controller = null
                stopTimer()
            }
            is RecordingController.Result.Aborted -> {
                lastMessage.value = successMessage
                sessionState.value = s.loadSession(result.sessionId).state
                lastVerification.value = null
                controller = null
                stopTimer()
            }
            is RecordingController.Result.ActionFailed -> {
                lastMessage.value = "$failurePrefix：${result.reason}"
            }
            is RecordingController.Result.StopFailed -> {
                lastMessage.value = "$failurePrefix：${result.reason}（文件已如实标记未完成）"
                sessionState.value = s.loadSession(result.sessionId).state
                lastVerification.value = null
                controller = null
                stopTimer()
            }
            is RecordingController.Result.StartFailed -> {
                lastMessage.value = "$failurePrefix：${result.reason}"
            }
            is RecordingController.Result.Started -> {
                lastMessage.value = "未预期：重复启动"
            }
        }
    }

    private fun onEngineErrorFromCallback(reason: String) {
        val c = controller ?: return
        ops.execute {
            c.onEngineError(reason)
            val sid = sessionId.value
            main.post {
                if (sid != null) {
                    sessionState.value = runCatching { store?.loadSession(sid)?.state }.getOrNull()
                }
                lastMessage.value = "录制中断：$reason（会话已如实标记为中断）"
                pendingOp.value = PendingOp.IDLE
                stopTimer()
                stopLocationSampling()
                appContext?.let { RecordingService.stop(it) }
                screenProjection = null
            }
        }
    }

    // ---------------------------------------------------------------- 计时

    private fun startTimer(sessionId: String) {
        timerBaseWallMs = System.currentTimeMillis()
        timerPausedTotalMs = 0L
        timerPauseStartedAt = 0L
        timerJob?.cancel()
        timerJob = timerScope.launch {
            while (true) {
                val state = sessionState.value
                if (state != SessionState.RECORDING && state != SessionState.PAUSED) break
                if (state == SessionState.RECORDING) {
                    val frozenPause = if (timerPauseStartedAt > 0) {
                        System.currentTimeMillis() - timerPauseStartedAt
                    } else {
                        0L
                    }
                    val elapsed = System.currentTimeMillis() - timerBaseWallMs -
                        timerPausedTotalMs - frozenPause
                    elapsedDisplay.value = formatElapsed(elapsed)
                }
                delay(500)
            }
        }
    }

    private fun stopTimer() {
        timerJob?.cancel()
        timerJob = null
        // 保留最后一次 elapsedDisplay 供界面显示终值；新会话开始时重置
    }

    private fun formatElapsed(ms: Long): String {
        val totalSec = (ms / 1000).coerceAtLeast(0)
        val h = totalSec / 3600
        val m = (totalSec % 3600) / 60
        val s = totalSec % 60
        return if (h > 0) {
            "%d:%02d:%02d".format(h, m, s)
        } else {
            "%02d:%02d".format(m, s)
        }
    }

    private fun facingLabel(facing: String): String =
        if (facing == "front") "前置摄像头" else "后置摄像头"

    private fun stopPhaseLabel(phase: re.tracekeep.core.recording.StopProgress): String = when (phase) {
        re.tracekeep.core.recording.StopProgress.STOPPING -> "正在停止录制"
        re.tracekeep.core.recording.StopProgress.FINALIZING -> "正在封装文件"
        re.tracekeep.core.recording.StopProgress.SAVING -> "正在保存到本地证据库"
    }

    // 由 attachPreview 保存当前 PreviewView 引用（startVideo 重建引擎时重新绑定）
    private var previewViewRef: PreviewView? = null
    private var videoLifecycleOwner: LifecycleOwner? = null

    private fun rememberPreviewContext(owner: LifecycleOwner, view: PreviewView) {
        videoLifecycleOwner = owner
        previewViewRef = view
    }

    private fun clearPreviewContext() {
        previewViewRef = null
        videoLifecycleOwner = null
    }
}
