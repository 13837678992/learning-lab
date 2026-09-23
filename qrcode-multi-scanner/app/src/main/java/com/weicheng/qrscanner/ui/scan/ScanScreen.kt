package com.weicheng.qrscanner.ui.scan

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.FocusMeteringAction
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.weicheng.qrscanner.BuildConfig
import com.weicheng.qrscanner.scan.QrAnalyzer
import com.weicheng.qrscanner.scan.ScanFrame
import com.weicheng.qrscanner.scan.SingleShotGate
import com.weicheng.qrscanner.scan.TapFocus
import com.weicheng.qrscanner.scan.ZoomPresets
import com.weicheng.qrscanner.scan.awaitCameraProvider
import com.weicheng.qrscanner.scan.buildImageAnalysis
import com.weicheng.qrscanner.ui.components.AppTopBar
import com.weicheng.qrscanner.util.AppLog
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.abs

/** 相机权限的四种界面状态。 */
private enum class CameraPermissionState { NotRequested, Granted, Denied, Blocked }

/**
 * 点击对焦触发后多久自动取消。
 *
 * 取消后会回到相机自己的连续自动对焦，不会把对焦点永久锁死在用户点过的位置。
 */
private const val FOCUS_AUTO_CANCEL_SECONDS = 3L

/** 判定某个缩放档位是否处于选中态时的浮点容差（设备回读的倍率未必是精确的 2.0）。 */
private const val ZOOM_SELECTION_TOLERANCE = 0.01f

/** 持续没扫出来时的引导文案。 */
private const val FAILURE_HINT_TEXT = "没扫出来？靠近一些，让二维码占满扫描框"

/**
 * 扫码页。单张扫描与多张扫描共用，区别只在标题、副标题和 [onScanned] 后续动作。
 *
 * 「一张只扫一次」的完整链路：
 * 1. 进入本页 == 新建一个 [SingleShotGate] 与一个 [QrAnalyzer]；
 * 2. 第一帧命中即 `gate.tryConsume()` 成功 → 立即 `unbindAll()` 停止取景；
 * 3. 回调 [onScanned] 后页面被销毁，闸门随之作废；
 * 4. 想再扫一张，必须重新进入本页 → 得到全新闸门。
 *
 * 因此「扫描成功后不自动进入下一张」不是靠判断，而是页面的生命周期本身。
 */
@Composable
fun ScanScreen(
    title: String,
    scannedCount: Int?,
    onBack: () -> Unit,
    onScanned: (String) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var permissionState by rememberSaveable {
        mutableStateOf(
            if (context.hasCameraPermission()) {
                CameraPermissionState.Granted
            } else {
                CameraPermissionState.NotRequested
            },
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        permissionState = when {
            granted -> CameraPermissionState.Granted
            // 还能再次弹窗 -> 普通拒绝；连弹窗都不给了 -> 已被永久拒绝，只能去设置。
            context.findActivity()?.shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) == true ->
                CameraPermissionState.Denied
            else -> CameraPermissionState.Blocked
        }
    }

    // 首次进入自动申请一次；被拒绝后不再反复弹窗打扰用户。
    LaunchedEffect(Unit) {
        if (permissionState == CameraPermissionState.NotRequested) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // 从系统设置返回时重新确认权限，避免用户已经授权、界面还停在「打开设置」。
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME && context.hasCameraPermission()) {
                permissionState = CameraPermissionState.Granted
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = title,
                onBack = onBack,
                subtitle = scannedCount?.let { "已扫描 $it 张" },
            )
        },
        // 顶部交给 AppTopBar 自己处理状态栏内边距，这里只留左右与底部。
        contentWindowInsets = WindowInsets.safeDrawing.only(
            WindowInsetsSides.Horizontal + WindowInsetsSides.Bottom,
        ),
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .background(Color.Black),
        ) {
            when (permissionState) {
                CameraPermissionState.Granted -> {
                    // 相机侧与覆盖层之间唯一的通信渠道。相机就绪后由相机侧填入操作回调，
                    // 覆盖层只负责把用户手势换算成相机操作。
                    val scanControl = remember { ScanControlState() }
                    CameraPreview(scanControl = scanControl, onScanned = onScanned)
                    ScanOverlay(scanControl = scanControl)
                }

                CameraPermissionState.NotRequested -> Unit

                CameraPermissionState.Denied -> PermissionExplanation(
                    message = "需要相机权限才能扫描二维码",
                    actionLabel = "授予权限",
                    onAction = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                )

                CameraPermissionState.Blocked -> PermissionExplanation(
                    message = "相机权限已被拒绝。\n请在系统设置中开启后返回本页。",
                    actionLabel = "打开设置",
                    onAction = { context.openAppSettings() },
                )
            }
        }
    }
}

/**
 * 相机与分析状态在「相机侧」与「覆盖层」之间的共享载体。
 *
 * 之所以需要它：取景框、缩放档位、提示文案画在 Compose 覆盖层里，而相机对象、对焦、
 * 缩放能力都在 [CameraPreview] 里。两者是兄弟节点，只能通过一个共同的持有者通信。
 *
 * 界面要读的字段用 `mutableStateOf`；只在手势回调里读的尺寸用普通字段，
 * 免得每次布局变化都触发重组。
 */
@Stable
private class ScanControlState {

    /** 覆盖层尺寸，用于把点击坐标换算到预览视图坐标。 */
    var overlayWidth: Float = 0f
    var overlayHeight: Float = 0f

    /** 预览视图，由相机侧填入。null 表示相机尚未就绪，此时点击不生效。 */
    var previewView: PreviewView? = null

    /** 对焦入口，接收的是**预览视图坐标**。 */
    var onFocusViewPoint: ((Float, Float) -> Unit)? = null

    /** 缩放入口。 */
    var onZoomSelected: ((Float) -> Unit)? = null

    /** 设备支持的缩放档位。为空表示这台设备不值得显示缩放控件。 */
    var zoomPresets: List<Float> by mutableStateOf(emptyList())

    /** 当前缩放倍率，由相机状态回读，用于高亮档位。 */
    var selectedZoom: Float by mutableStateOf(1f)

    /** 持续没扫出来时显示引导。 */
    var failureHintVisible: Boolean by mutableStateOf(false)

    /** debug 包显示的实际分析分辨率。 */
    var analysisLabel: String by mutableStateOf("")

    /** 把覆盖层上的点击换算成预览视图坐标后触发对焦。 */
    fun requestFocusAt(overlayX: Float, overlayY: Float) {
        val view = previewView ?: return
        val point = TapFocus.toViewPoint(
            x = overlayX,
            y = overlayY,
            overlayWidth = overlayWidth,
            overlayHeight = overlayHeight,
            viewWidth = view.width.toFloat(),
            viewHeight = view.height.toFloat(),
        ) ?: return
        onFocusViewPoint?.invoke(point.x, point.y)
    }

    /** 进入页面时对画面中心做一次初始对焦。 */
    fun requestCenterFocus() {
        val view = previewView ?: return
        if (view.width <= 0 || view.height <= 0) return
        onFocusViewPoint?.invoke(view.width / 2f, view.height / 2f)
    }

    fun selectZoom(ratio: Float) {
        onZoomSelected?.invoke(ratio)
    }
}

/**
 * 相机预览 + 分析。
 *
 * 返回键或跳转都会让本 Composable 离开组合，[DisposableEffect] 负责解绑相机、
 * 关闭 ML Kit、释放线程、摘掉 LiveData 观察者，避免相机资源泄漏。
 */
@Composable
private fun CameraPreview(scanControl: ScanControlState, onScanned: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    val previewView = remember {
        PreviewView(context).apply { scaleType = PreviewView.ScaleType.FILL_CENTER }
    }

    // 一次扫码尝试 = 一个闸门 = 一个分析器 = 一个页面实例。
    val gate = remember { SingleShotGate() }
    val analyzerExecutor = remember { Executors.newSingleThreadExecutor() }
    // 分析回调发生在分析线程上，而 Compose 状态必须在主线程写，用 Handler 切回来。
    val mainHandler = remember { Handler(Looper.getMainLooper()) }
    val providerHolder = remember { mutableStateOf<ProcessCameraProvider?>(null) }
    val analyzerHolder = remember { mutableStateOf<QrAnalyzer?>(null) }
    val cameraHolder = remember { mutableStateOf<Camera?>(null) }

    DisposableEffect(Unit) {
        onDispose {
            // 先摘观察者再解绑，避免解绑过程中相机状态回调又摸到已经作废的界面状态。
            previewView.previewStreamState.removeObservers(lifecycleOwner)
            cameraHolder.value?.cameraInfo?.zoomState?.removeObservers(lifecycleOwner)
            providerHolder.value?.unbindAll()
            analyzerHolder.value?.close()
            analyzerExecutor.shutdown()
        }
    }

    LaunchedEffect(Unit) {
        val provider = awaitCameraProvider(context)
        providerHolder.value = provider

        // Preview 独立于分析流配置：预览的分辨率取决于显示效果，
        // 而送给 ML Kit 的是分析流，两者互不影响。
        val preview = Preview.Builder().build().also {
            it.setSurfaceProvider(previewView.surfaceProvider)
        }

        val analyzer = QrAnalyzer(
            gate = gate,
            onDecoded = { rawValue ->
                // 顺序很重要：先停相机，再反馈，最后才跳转。
                provider.unbindAll()
                context.vibrateOnce()
                onScanned(rawValue)
            },
            onFailureHintChanged = { visible ->
                mainHandler.post { scanControl.failureHintVisible = visible }
            },
            onResolutionKnown = { width, height ->
                mainHandler.post { scanControl.analysisLabel = "分析 ${width}×$height" }
            },
        )
        analyzerHolder.value = analyzer

        // 分析流用高分辨率配置。高容量二维码扫不出来的根因就在这里，
        // 详见 CameraConfig.kt。
        val analysis = buildImageAnalysis(analyzerExecutor, analyzer)

        runCatching {
            provider.unbindAll()
            val camera = provider.bindToLifecycle(
                lifecycleOwner,
                CameraSelector.DEFAULT_BACK_CAMERA,
                preview,
                analysis,
            )
            cameraHolder.value = camera
            wireCameraControls(camera, previewView, scanControl, lifecycleOwner)
        }.onFailure { error ->
            AppLog.warn("camera bind failed", error)
        }
    }

    AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())
}

/**
 * 把相机的对焦与缩放能力接到界面上。
 *
 * 连续自动对焦是背摄的默认行为（`CONTROL_AF_MODE_CONTINUOUS_PICTURE`，CameraX 已设置），
 * 这里不需要、也无法通过公开 API 去改它。这里做的是在此之上补三件事：
 * 进入页面时对中心做一次初始对焦、允许用户点击某处重新对焦、以及按设备能力提供缩放档位。
 */
private fun wireCameraControls(
    camera: Camera,
    previewView: PreviewView,
    scanControl: ScanControlState,
    lifecycleOwner: LifecycleOwner,
) {
    val cameraControl = camera.cameraControl
    scanControl.previewView = previewView

    scanControl.onFocusViewPoint = { viewX, viewY ->
        // 注意：meteringPointFactory 内部会检查是否在主线程，而这个回调由点击手势触发，
        // 天然在主线程上，不要把它挪到后台线程去调。
        val action = FocusMeteringAction.Builder(
            previewView.meteringPointFactory.createPoint(viewX, viewY),
            // 同时测光：对焦和曝光一起重算，暗光下的高密度二维码才拉得回对比度。
            FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE,
        )
            .setAutoCancelDuration(FOCUS_AUTO_CANCEL_SECONDS, TimeUnit.SECONDS)
            .build()

        // 不支持测光对焦的设备（部分定焦机）直接跳过，而不是发起一个必然失败的对焦请求。
        if (camera.cameraInfo.isFocusMeteringSupported(action)) {
            cameraControl.startFocusAndMetering(action)
        }
    }

    scanControl.onZoomSelected = { ratio -> cameraControl.setZoomRatio(ratio) }

    camera.cameraInfo.zoomState.observe(lifecycleOwner) { zoomState ->
        val presets = ZoomPresets.presets(zoomState.minZoomRatio, zoomState.maxZoomRatio)
        scanControl.zoomPresets = presets
        // 步进变换时设备回读的倍率未必精确等于档位值，所以高亮判定带容差。
        scanControl.selectedZoom = zoomState.zoomRatio
    }

    // 进入页面后先对中心对焦一次。
    //
    // 必须等预览真正出帧（STREAMING）之后再调：PreviewView 的 meteringPointFactory 在
    // 内部变换矩阵就绪之前会返回哨兵值 PointF(2f, 2f)，用那个点做对焦点是无效的，
    // 而这个矩阵只有等到视频流真正起来才会算出来。
    var initialFocusRequested = false
    previewView.previewStreamState.observe(lifecycleOwner) { state ->
        if (!initialFocusRequested && state == PreviewView.StreamState.STREAMING) {
            initialFocusRequested = true
            scanControl.requestCenterFocus()
        }
    }
}

/**
 * 取景引导层：四周压暗、中间留出方框，底部给出引导与缩放档位。
 *
 * 注意这只是视觉引导，实际识别区域是整个画面——ML Kit 对整帧做检测，
 * 不限制在框内，这样用户稍微偏离也能扫到，成功率更高。
 *
 * 但取景框的**大小**会实实在在影响成功率：用户天然会把二维码摆进框里，
 * 框越大，二维码在画面里占的面积就越大，落到每个 QR module 上的像素就越多——
 * 高容量二维码恰恰是因为 module 像素不足才扫不出来。所以这里取 0.85，
 * 并用文案明确引导用户把二维码「占满」扫描框。
 */
@Composable
private fun ScanOverlay(scanControl: ScanControlState, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize()) {
        // 取景框与点击对焦区域。Canvas 本身不消费触摸，手势统一挂在这一层上。
        Box(
            modifier = Modifier
                .fillMaxSize()
                .onSizeChanged {
                    scanControl.overlayWidth = it.width.toFloat()
                    scanControl.overlayHeight = it.height.toFloat()
                }
                // 点击任意位置重新对焦。挂在这里的 tap 不会和下面的按钮抢事件：
                // 子节点先于父节点命中并消费事件。
                .pointerInput(Unit) {
                    detectTapGestures { offset ->
                        scanControl.requestFocusAt(offset.x, offset.y)
                    }
                },
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val frameSide = ScanFrame.side(size.width, size.height)
                if (frameSide <= 0f) return@Canvas

                val left = (size.width - frameSide) / 2f
                val top = (size.height - frameSide) / 2f
                val right = left + frameSide
                val bottom = top + frameSide
                val scrim = Color.Black.copy(alpha = 0.55f)

                // 上 / 下 / 左 / 右 四块遮罩，围出中间的取景框
                drawRect(color = scrim, size = Size(size.width, top))
                drawRect(
                    color = scrim,
                    topLeft = Offset(0f, bottom),
                    size = Size(size.width, size.height - bottom),
                )
                drawRect(
                    color = scrim,
                    topLeft = Offset(0f, top),
                    size = Size(left, frameSide),
                )
                drawRect(
                    color = scrim,
                    topLeft = Offset(right, top),
                    size = Size(size.width - right, frameSide),
                )

                drawRoundRect(
                    color = Color.White,
                    topLeft = Offset(left, top),
                    size = Size(frameSide, frameSide),
                    cornerRadius = CornerRadius(16.dp.toPx()),
                    style = Stroke(width = 3.dp.toPx()),
                )
            }
        }

        // 引导与控件。放在取景框那一层之后，因此绘制在上层、也先于它接收触摸事件。
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            GuidanceLine("让二维码占满扫描框", emphasized = true)
            // 二维码四周的空白区（quiet zone）是定位图案的一部分，缺了会影响识别，
            // 所以要让用户知道「完整」包括那圈白边。单位用厘米比用倍数更好操作。
            GuidanceLine("四周留出空白，完整放入，距离 10–20 厘米")

            if (scanControl.failureHintVisible) {
                Text(
                    text = FAILURE_HINT_TEXT,
                    color = Color(0xFFFFC107),
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }

            if (scanControl.zoomPresets.isNotEmpty()) {
                ZoomSelector(scanControl)
            }

            // 只在 debug 包里显示实际生效的分析分辨率。这是真机上确认分辨率优化
            // 是否真的生效的最直接方式，不用连电脑看日志。
            if (BuildConfig.DEBUG && scanControl.analysisLabel.isNotEmpty()) {
                Text(
                    text = scanControl.analysisLabel,
                    color = Color.White.copy(alpha = 0.6f),
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }
    }
}

/** 底部的一行引导文案。 */
@Composable
private fun GuidanceLine(text: String, emphasized: Boolean = false) {
    Text(
        text = text,
        color = if (emphasized) Color.White else Color.White.copy(alpha = 0.75f),
        style = if (emphasized) {
            MaterialTheme.typography.bodyLarge
        } else {
            MaterialTheme.typography.bodySmall
        },
        textAlign = TextAlign.Center,
        modifier = Modifier
            .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
            .padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

/**
 * 缩放档位选择。
 *
 * 档位由设备的实际能力推导（见 [ZoomPresets]），不存在「所有手机都有 2×」这种假设；
 * 设备若不支持缩放，整个控件不会显示。
 *
 * 用放大倍率而不是滑杆：滑杆在单手持机对准二维码时很难精确操作，
 * 而且用户真正需要的只是几档明确的「近一点」。
 */
@Composable
private fun ZoomSelector(scanControl: ScanControlState) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = "放大倍数",
            color = Color.White.copy(alpha = 0.6f),
            style = MaterialTheme.typography.labelSmall,
        )
        Box(
            modifier = Modifier
                .background(Color.Black.copy(alpha = 0.45f), RoundedCornerShape(24.dp))
                .padding(4.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                scanControl.zoomPresets.forEach { ratio ->
                    val selected = abs(ratio - scanControl.selectedZoom) < ZOOM_SELECTION_TOLERANCE
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(if (selected) Color.White else Color.Transparent)
                            .clickable { scanControl.selectZoom(ratio) }
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                    ) {
                        Text(
                            text = String.format(Locale.US, "%.1fx", ratio),
                            color = if (selected) Color.Black else Color.White,
                            style = MaterialTheme.typography.labelLarge,
                        )
                    }
                }
            }
        }
    }
}

/** 权限被拒绝时的说明与补救入口。 */
@Composable
private fun PermissionExplanation(
    message: String,
    actionLabel: String,
    onAction: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = message,
            color = Color.White,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(20.dp))
        Button(onClick = onAction) {
            Text(actionLabel)
        }
    }
}

private fun Context.hasCameraPermission(): Boolean =
    ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
        PackageManager.PERMISSION_GRANTED

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

private fun Context.openAppSettings() {
    startActivity(
        Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", packageName, null),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
    )
}

/**
 * 扫码成功的一次震动反馈。
 *
 * 用震动而不是弹窗或声音：既明显又不打断操作，也符合「扫描失败时不要频繁弹窗」的要求
 * （失败路径完全不触发任何提示，用户只管继续对准即可）。
 */
private fun Context.vibrateOnce() {
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        (getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)
    } ?: return

    vibrator.vibrate(VibrationEffect.createOneShot(60L, VibrationEffect.DEFAULT_AMPLITUDE))
}
