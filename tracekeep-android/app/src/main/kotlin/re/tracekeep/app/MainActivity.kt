package re.tracekeep.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import re.tracekeep.app.recording.LocationSampler
import re.tracekeep.app.recording.PendingOp
import re.tracekeep.app.recording.RecordingMode
import re.tracekeep.app.export.EvidenceExporter
import re.tracekeep.app.library.EvidenceLibrary
import re.tracekeep.app.recording.RecordingSessionHolder
import re.tracekeep.core.model.LegalCopy
import re.tracekeep.core.model.SessionState
import re.tracekeep.core.recording.LocationWatermarkState

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Edge-to-edge 由 targetSdk 35 强制；显式启用并在根布局应用 safeDrawing Insets
        // （修复：顶部模式切换被状态栏覆盖、底部按钮被手势导航栏覆盖）。
        enableEdgeToEdge()
        val app = application as TraceKeepApp
        RecordingSessionHolder.init(this, app.store)
        RecordingSessionHolder.refresh()

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    // safeDrawing = 状态栏 + 刘海 + 导航栏（手势/三键）安全区域，
                    // 保证顶部模式切换栏与底部操作区始终完整可见、可点击。
                    RecordingScreen(
                        modifier = Modifier
                            .fillMaxSize()
                            .windowInsetsPadding(WindowInsets.safeDrawing),
                    )
                }
            }
        }
    }
}

@Composable
private fun RecordingScreen(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var permissionDenied by remember { mutableStateOf<String?>(null) }
    var mode by rememberSaveable { mutableStateOf(RecordingMode.AUDIO) }
    var previewReady by remember { mutableStateOf(false) }
    var pendingStartMode by remember { mutableStateOf<RecordingMode?>(null) }

    val state = RecordingSessionHolder.sessionState.value
    val pending = RecordingSessionHolder.pendingOp.value
    val message = RecordingSessionHolder.lastMessage.value
    val verification = RecordingSessionHolder.lastVerification.value
    val activeSessionId = RecordingSessionHolder.sessionId.value
    val elapsed = RecordingSessionHolder.elapsedDisplay.value
    val locationOn = RecordingSessionHolder.locationEnabled.value
    val watermarkOn = RecordingSessionHolder.watermarkEnabled.value
    val locationState = RecordingSessionHolder.locationState.value
    val stopPhase = RecordingSessionHolder.stopPhase.value
    val saveStatus = RecordingSessionHolder.saveStatus.value
    val saveErrorReason = RecordingSessionHolder.saveErrorReason.value
    var showLibrary by remember { mutableStateOf(false) }
    val idle = (state == null || state.isTerminal) && pending == PendingOp.IDLE
    val recordingActive = state == SessionState.RECORDING || state == SessionState.PAUSED

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* 拒绝时前台服务仍可运行，仅通知不可见；不阻断录制 */ }

    fun requestNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants ->
        val granted = grants.values.any { it }
        if (granted) {
            permissionDenied = null
            RecordingSessionHolder.setLocationEnabled(true)
        } else {
            permissionDenied = "定位权限被拒绝：位置记录保持关闭（水印将显示「位置 未启用」）。"
            RecordingSessionHolder.setLocationEnabled(false)
        }
    }

    val audioPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            permissionDenied = null
            val startMode = pendingStartMode
            pendingStartMode = null
            if (startMode != null) {
                RecordingSessionHolder.start(startMode)
                requestNotificationsIfNeeded()
            }
        } else {
            permissionDenied = "麦克风权限被拒绝：无法录音。可在系统设置中重新授权。"
            pendingStartMode = null
        }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            permissionDenied = null
        } else {
            permissionDenied = "相机权限被拒绝：无法录像。可在系统设置中重新授权。"
            pendingStartMode = null
        }
    }

    // 系统录屏授权（每次会话重新授权；Android 14+ 由 RecordingSessionHolder 保证
    // mediaProjection 前台服务先于令牌使用启动）
    val mediaProjectionPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val data = result.data
        if (result.resultCode == android.app.Activity.RESULT_OK && data != null) {
            val mpm = context.getSystemService(android.media.projection.MediaProjectionManager::class.java)
            val projection = mpm.getMediaProjection(result.resultCode, data)
            if (projection != null) {
                RecordingSessionHolder.onScreenProjectionGranted(projection)
            } else {
                RecordingSessionHolder.onScreenProjectionDenied()
                permissionDenied = "获取录屏令牌失败：未开始录屏。"
            }
        } else {
            RecordingSessionHolder.onScreenProjectionDenied()
            permissionDenied = "已取消系统录屏授权：未开始录屏。"
        }
    }

    Column(
        modifier = modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // ── 顶部（固定）：标题 + 模式切换。始终可见，不被任何内容覆盖。 ──
        Text(
            "TraceKeep（证迹）",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(top = 4.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = mode == RecordingMode.AUDIO,
                enabled = idle,
                onClick = {
                    mode = RecordingMode.AUDIO
                    permissionDenied = null
                    RecordingSessionHolder.currentMode.value = RecordingMode.AUDIO
                },
                label = { Text("录音") },
            )
            FilterChip(
                selected = mode == RecordingMode.CAMERA,
                enabled = idle,
                onClick = {
                    mode = RecordingMode.CAMERA
                    permissionDenied = null
                    RecordingSessionHolder.currentMode.value = RecordingMode.CAMERA
                    val hasCamera = ContextCompat.checkSelfPermission(
                        context, Manifest.permission.CAMERA,
                    ) == PackageManager.PERMISSION_GRANTED
                    if (!hasCamera) {
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                },
                label = { Text("摄像头录像") },
            )
            FilterChip(
                selected = mode == RecordingMode.SCREEN,
                enabled = idle,
                onClick = {
                    mode = RecordingMode.SCREEN
                    permissionDenied = null
                    RecordingSessionHolder.currentMode.value = RecordingMode.SCREEN
                },
                label = { Text("屏幕录制") },
            )
            if (recordingActive) {
                Text(
                    "录制中不可切换模式",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.align(Alignment.CenterVertically),
                )
            }
        }

        // ── 中部（弹性区域，weight）：录像=取景预览；录音=醒目状态面板。
        // 预览只占用分配到的区域，永远不会挤压/覆盖顶部与底部控件。 ──
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            if (mode == RecordingMode.CAMERA) {
                CameraPreviewBox(
                    lifecycleOwner = lifecycleOwner,
                    fallbackMessage = if (recordingActive) null else "取景画面",
                    onReady = { previewReady = true },
                    onDisposed = {
                        previewReady = false
                        if (!recordingActive) RecordingSessionHolder.detachPreview()
                    },
                )
            } else {
                AudioStatusPanel(
                    state = state,
                    pending = pending,
                    elapsed = elapsed,
                    stopPhase = stopPhase,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }

        // ── 状态卡（固定）：如实显示状态/提示/校验结果，不覆盖任何控件。 ──
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (state == SessionState.RECORDING) {
                        BlinkingRecDot()
                    }
                    Text(
                        stateText(state, pending, activeSessionId, stopPhase),
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    if (recordingActive) {
                        Text(elapsed, style = MaterialTheme.typography.bodyLarge)
                    }
                }
                // 本地保存结果（停止后直接保存专项：成功/失败均如实显示）
                when (saveStatus) {
                    "SAVED" -> Text(
                        "✓ 保存成功，已存入本地证据库",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF2E7D32),
                    )
                    "FAILED" -> Text(
                        "✗ 保存失败（未存入证据库）：${saveErrorReason ?: "原因未知"}；录制文件已保留",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
                if (message != null) {
                    Text(message, style = MaterialTheme.typography.bodySmall)
                }
                if (verification != null) {
                    Text(
                        "停止后文件校验：$verification（哈希一致仅说明字节未变，不代表内容真实）",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedButton(onClick = { showLibrary = true }) { Text("查看本地证据库") }
                    if (saveStatus == "SAVED") {
                        Text("记录已持久化，重启后仍可查看", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }

        if (showLibrary) {
            LibraryDialog(onClose = { showLibrary = false })
        }

        // 录屏音频来源（录屏模式可见；麦克风/内部音频/无音频——内部音频需 Android 10+）
        if (mode == RecordingMode.SCREEN) {
            val audioSource = RecordingSessionHolder.screenAudioSource.value
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("录屏音频：", style = MaterialTheme.typography.bodySmall)
                listOf(
                    re.tracekeep.core.recording.ScreenAudioSource.MICROPHONE to "麦克风",
                    re.tracekeep.core.recording.ScreenAudioSource.INTERNAL to "内部音频(10+)",
                    re.tracekeep.core.recording.ScreenAudioSource.NONE to "无音频",
                ).forEach { (source, label) ->
                    FilterChip(
                        selected = audioSource == source,
                        enabled = idle && !recordingActive,
                        onClick = { RecordingSessionHolder.screenAudioSource.value = source },
                        label = { Text(label, style = MaterialTheme.typography.bodySmall) },
                    )
                }
            }
        }

        // 视频水印开关（录像模式可见；默认开启，水印写入最终视频文件）
        if (mode == RecordingMode.CAMERA) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Switch(
                    checked = watermarkOn,
                    enabled = idle && !recordingActive,
                    onCheckedChange = { checked ->
                        RecordingSessionHolder.setWatermarkEnabled(checked)
                    },
                )
                Text(
                    if (watermarkOn) {
                        "视频水印（开启：时间/位置/编号写入视频画面）"
                    } else {
                        "视频水印（已关闭：本段录像不含水印，事件日志将如实记录）"
                    },
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }

        // 位置记录开关（随会话记录位置；水印位置行取决于实际定位结果）
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Switch(
                checked = locationOn,
                enabled = idle && !recordingActive,
                onCheckedChange = { checked ->
                    if (checked) {
                        val hasLoc = ContextCompat.checkSelfPermission(
                            context, Manifest.permission.ACCESS_FINE_LOCATION,
                        ) == PackageManager.PERMISSION_GRANTED ||
                            ContextCompat.checkSelfPermission(
                                context, Manifest.permission.ACCESS_COARSE_LOCATION,
                            ) == PackageManager.PERMISSION_GRANTED
                        if (hasLoc) {
                            RecordingSessionHolder.setLocationEnabled(true)
                        } else {
                            locationPermissionLauncher.launch(
                                arrayOf(
                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION,
                                ),
                            )
                        }
                    } else {
                        RecordingSessionHolder.setLocationEnabled(false)
                    }
                },
            )
            Text(
                "随录制记录位置（" + when {
                    !locationOn -> "关闭"
                    locationState.state == LocationWatermarkState.FIXED ->
                        "定位中；已取得定位，水印显示实际坐标"
                    locationState.state == LocationWatermarkState.SEARCHING -> "定位中…"
                    locationState.state == LocationWatermarkState.UNAVAILABLE -> "位置不可用"
                    else -> "未启用"
                } + "）",
                style = MaterialTheme.typography.bodySmall,
            )
        }

        // ── 底部操作区（固定，分两行）。始终可见、可点击。 ──
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 2.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Button(
                modifier = Modifier.weight(1f),
                enabled = idle && !RecordingSessionHolder.hasActiveSession &&
                    !(mode == RecordingMode.CAMERA && !previewReady),
                onClick = {
                    val needsMic = mode != RecordingMode.SCREEN ||
                        RecordingSessionHolder.screenAudioSource.value ==
                        re.tracekeep.core.recording.ScreenAudioSource.MICROPHONE
                    val hasMic = ContextCompat.checkSelfPermission(
                        context, Manifest.permission.RECORD_AUDIO,
                    ) == PackageManager.PERMISSION_GRANTED
                    if (needsMic && !hasMic) {
                        pendingStartMode = mode
                        audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    } else if (mode == RecordingMode.SCREEN) {
                        // 录屏：先起 mediaProjection 前台服务，再请求系统授权（14+ 顺序要求）
                        RecordingSessionHolder.start(RecordingMode.SCREEN)
                        requestNotificationsIfNeeded()
                        val mpm = context.getSystemService(
                            android.media.projection.MediaProjectionManager::class.java,
                        )
                        mediaProjectionPermissionLauncher.launch(mpm.createScreenCaptureIntent())
                    } else {
                        RecordingSessionHolder.start(mode)
                        requestNotificationsIfNeeded()
                    }
                },
            ) {
                Text(
                    when {
                        pending == PendingOp.STARTING && mode == RecordingMode.SCREEN -> "等待录屏授权…"
                        pending == PendingOp.STARTING -> "正在启动…"
                        mode == RecordingMode.CAMERA && !previewReady -> "等待取景画面…"
                        mode == RecordingMode.CAMERA -> "开始录像"
                        mode == RecordingMode.SCREEN -> "开始录屏"
                        else -> "开始录音"
                    },
                )
            }
            OutlinedButton(
                enabled = idle && mode == RecordingMode.CAMERA,
                onClick = { RecordingSessionHolder.switchCamera() },
            ) { Text("切换镜头") }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedButton(
                modifier = Modifier.weight(1f),
                enabled = state == SessionState.RECORDING && pending == PendingOp.IDLE &&
                    mode != RecordingMode.SCREEN,
                onClick = { RecordingSessionHolder.pause() },
            ) { Text("暂停") }
            OutlinedButton(
                modifier = Modifier.weight(1f),
                enabled = state == SessionState.PAUSED && pending == PendingOp.IDLE,
                onClick = { RecordingSessionHolder.resume() },
            ) { Text("继续") }
            Button(
                modifier = Modifier.weight(1f),
                enabled = recordingActive && pending == PendingOp.IDLE,
                onClick = { RecordingSessionHolder.stop() },
            ) { Text(if (pending == PendingOp.SAVING) "正在保存…" else "停止并封装") }
            OutlinedButton(
                modifier = Modifier.weight(1f),
                enabled = recordingActive && pending == PendingOp.IDLE,
                onClick = { RecordingSessionHolder.abort() },
            ) { Text("放弃") }
        }

        if (permissionDenied != null) {
            Text(
                permissionDenied!!,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
        }

        Text(
            "合法录制提示：录制涉及他人声音、影像或私人空间的内容可能涉及他人合法权益，请确保录制行为合法；本应用不替代你对录制合法性的判断。",
            style = MaterialTheme.typography.bodySmall,
        )
        Text(LegalCopy.PRODUCT_STATEMENT, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
    }
}

/** 摄像头取景（仅占用分配区域；生命周期内单实例绑定，防重复创建资源）。 */
@Composable
private fun CameraPreviewBox(
    lifecycleOwner: androidx.lifecycle.LifecycleOwner,
    fallbackMessage: String?,
    onReady: () -> Unit,
    onDisposed: () -> Unit,
) {
    DisposableEffect(Unit) {
        onDispose {
            onDisposed()
        }
    }
    // 裁剪加固：SurfaceView 型预览（默认 PERFORMANCE 模式）在部分设备上是独立图层，
    // 可能无视父布局边界绘制并遮挡其他控件；外层 clipToBounds + 内层 COMPATIBLE(TextureView)
    // 双保险，保证预览像素不越出本 Box 的分配区域。
    Box(
        modifier = Modifier
            .fillMaxSize()
            .clipToBounds()
            .background(Color(0xFF202020), RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center,
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                PreviewView(ctx).also { view ->
                    // COMPATIBLE：内部使用 TextureView，作为普通 View 参与布局层级，
                    // 不会像 SurfaceView 一样把画面画到兄弟控件之上（布局覆盖问题的根因修复）。
                    view.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                    view.scaleType = PreviewView.ScaleType.FIT_CENTER
                    RecordingSessionHolder.attachPreview(lifecycleOwner, view)
                    onReady()
                }
            },
            update = { /* 绑定一次性完成；重复重组不重复绑定（attachPreview 幂等） */ },
        )
        if (fallbackMessage != null) {
            Text(fallbackMessage, color = Color.White, style = MaterialTheme.typography.bodySmall)
        }
    }
}

/** 录音状态面板：醒目指示点 + 状态 + 计时（问题二：避免"以为没在录"）。 */
@Composable
private fun AudioStatusPanel(
    state: SessionState?,
    pending: PendingOp,
    elapsed: String,
    stopPhase: String?,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.background(Color(0xFFF5F5F5), RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            when {
                state == SessionState.RECORDING -> {
                    BlinkingRecDot(size = 22.dp)
                    Text("正在录音", style = MaterialTheme.typography.headlineSmall)
                    Text(elapsed, style = MaterialTheme.typography.headlineMedium)
                }
                state == SessionState.PAUSED -> {
                    Box(
                        modifier = Modifier
                            .size(22.dp)
                            .background(Color(0xFFFFA000), CircleShape),
                    )
                    Text("已暂停（录音暂停，未在采集）", style = MaterialTheme.typography.titleMedium)
                    Text(elapsed, style = MaterialTheme.typography.headlineMedium)
                }
                pending == PendingOp.STARTING -> Text("正在初始化录音…", style = MaterialTheme.typography.titleMedium)
                pending == PendingOp.SAVING ->
                    Text(stopPhase ?: "正在停止并保存…", style = MaterialTheme.typography.titleMedium)
                state == SessionState.STOPPED || state == SessionState.SEALED ->
                    Text("已停止（保存结果见下方状态）", style = MaterialTheme.typography.titleMedium)
                state == SessionState.ABORTED ->
                    Text("本次录音已中断", style = MaterialTheme.typography.titleMedium)
                else -> Text("空闲，尚未开始录音", style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

/** 闪烁的红色录制指示点（录制中状态提示；透明度动画）。 */
@Composable
private fun BlinkingRecDot(size: androidx.compose.ui.unit.Dp = 14.dp) {
    val transition = rememberInfiniteTransition(label = "rec")
    val alpha by transition.animateFloat(
        initialValue = 1f,
        targetValue = 0.25f,
        animationSpec = infiniteRepeatable(tween(600), RepeatMode.Reverse),
        label = "recAlpha",
    )
    Box(
        modifier = Modifier
            .size(size)
            .alpha(alpha)
            .background(Color(0xFFD32F2F), CircleShape),
    )
}

private fun stateText(
    state: SessionState?,
    pending: PendingOp,
    sessionId: String?,
    stopPhase: String? = null,
): String = when {
    pending == PendingOp.STARTING -> "正在初始化录制…"
    pending == PendingOp.SAVING -> stopPhase ?: "正在停止并保存…"
    state == null -> "空闲（无会话）"
    state == SessionState.CREATED -> "已创建，正在启动引擎…"
    state == SessionState.RECORDING -> "录制中（会话 $sessionId）"
    state == SessionState.PAUSED -> "已暂停（会话 $sessionId）"
    state == SessionState.STOPPED -> "已停止（保存结果见下方状态）"
    state == SessionState.SEALED -> "已封存（会话 $sessionId）"
    state == SessionState.ABORTED -> "已中断（异常或用户放弃；材料保留并如实标记）"
    else -> "未知状态"
}

/** 本地证据库查看对话框（只读列表；验证保存记录持久化）。 */
@Composable
private fun LibraryDialog(onClose: () -> Unit) {
    val context = LocalContext.current
    var refreshTick by remember { mutableStateOf(0) }
    val records = remember(refreshTick) { RecordingSessionHolder.listLibraryRecords() }
    var opResult by remember { mutableStateOf<EvidenceLibrary.OpResult?>(null) }
    // 阶段 9：证据包导出（SAF 目录选择；导出不修改原始证据）
    var pendingExportSessionId by remember { mutableStateOf<String?>(null) }
    val exportLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocumentTree(),
    ) { uri ->
        val sid = pendingExportSessionId
        pendingExportSessionId = null
        if (uri != null && sid != null) {
            val r = EvidenceExporter.exportToSafTree(
                context,
                (context.applicationContext as TraceKeepApp).store,
                sid,
                uri,
                BuildConfig.VERSION_NAME,
            )
            opResult = EvidenceLibrary.OpResult(r.ok, r.message, r.details)
            refreshTick++
        }
    }
    androidx.compose.ui.window.Dialog(onDismissRequest = onClose) {
        Card {
            Column(
                Modifier
                    .padding(20.dp)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("本地证据库", style = MaterialTheme.typography.titleLarge)
                if (records.isEmpty()) {
                    Text("（暂无记录）", style = MaterialTheme.typography.bodyMedium)
                }
                records.forEach { record ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            val typeLabel = when (record.recordingType) {
                                "AUDIO" -> "录音"
                                "CAMERA_VIDEO" -> "录像"
                                "SCREEN" -> "录屏"
                                else -> record.recordingType
                            }
                            Text(
                                "$typeLabel · ${record.saveStatus ?: record.state}",
                                style = MaterialTheme.typography.titleSmall,
                            )
                            Text(record.fileName ?: "(文件记录缺失)", style = MaterialTheme.typography.bodySmall)
                            record.sizeBytes?.let {
                                Text("大小：$it 字节", style = MaterialTheme.typography.bodySmall)
                            }
                            record.sha256?.let {
                                Text("SHA-256：${it.take(20)}…", style = MaterialTheme.typography.bodySmall)
                            }
                            record.savedAtWallMs?.let {
                                Text("保存时间（设备时间）：$it", style = MaterialTheme.typography.bodySmall)
                            }
                            record.verification?.let {
                                Text("当前复核：$it", style = MaterialTheme.typography.bodySmall)
                            }
                            record.saveErrorReason?.let {
                                Text(
                                    "失败原因：$it",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error,
                                )
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    enabled = record.state == "STOPPED" || record.state == "ABORTED" ||
                                        record.state == "SEALED",
                                    onClick = {
                                        opResult = EvidenceLibrary.sealAndSign(
                                            context,
                                            (context.applicationContext as TraceKeepApp).store,
                                            record.sessionId,
                                            BuildConfig.VERSION_NAME,
                                        )
                                        refreshTick++
                                    },
                                ) { Text("封存并签名") }
                                OutlinedButton(
                                    onClick = {
                                        opResult = EvidenceLibrary.verify(
                                            context,
                                            (context.applicationContext as TraceKeepApp).store,
                                            record.sessionId,
                                        )
                                    },
                                ) { Text("验证") }
                                OutlinedButton(
                                    onClick = {
                                        pendingExportSessionId = record.sessionId
                                        exportLauncher.launch(null)
                                    },
                                ) { Text("导出证据包") }
                            }
                        }
                    }
                }
                opResult?.let { r ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(
                                r.message,
                                style = MaterialTheme.typography.titleSmall,
                                color = if (r.ok) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                            )
                            r.details.forEach {
                                Text(it, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
                Text(
                    "以上为本地记录；哈希一致仅说明字节未变，不代表内容真实。",
                    style = MaterialTheme.typography.labelSmall,
                )
                Button(onClick = onClose, modifier = Modifier.fillMaxWidth()) { Text("关闭") }
            }
        }
    }
}

