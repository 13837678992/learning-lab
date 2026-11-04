package re.tracekeep.app.recording

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import re.tracekeep.app.R

/**
 * 录制前台服务（需求 §3：录音/录像必须以前台服务运行，通知对用户可见）。
 *
 * 职责边界：本服务**不拥有录制逻辑**（录制由 RecordingController 编排），
 * 只保证用户在录制期间看到持续、清晰的通知，且在系统层面维持录制进程。
 * 状态真相仍来自会话状态机与事件日志——通知文案不夸大任何法律能力。
 *
 * 前台服务类型按模式选择（14+ 强制声明对应权限）：
 * - 录音：microphone（FOREGROUND_SERVICE_MICROPHONE）
 * - 录像：camera（FOREGROUND_SERVICE_CAMERA；若同时录麦克风音轨，
 *   系统会校验 microphone 类型——本实现按录像会话同时声明 camera+microphone）
 *
 * 生命周期策略：START_NOT_STICKY——进程被杀后系统不自动重启服务（不瞒着用户继续录制）；
 * 中断会话由下次启动的恢复扫描如实标记为 ABORTED。
 */
class RecordingService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "录制进行中",
                NotificationManager.IMPORTANCE_LOW,
            ).apply { description = "录制期间显示的状态通知" },
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val isVideo = intent?.getBooleanExtra(EXTRA_VIDEO, false) == true
        val isScreen = intent?.getBooleanExtra(EXTRA_SCREEN, false) == true
        val withLocation = intent?.getBooleanExtra(EXTRA_LOCATION, false) == true
        val title = when {
            isScreen -> "TraceKeep 正在录屏"
            isVideo -> "TraceKeep 正在录像"
            else -> "TraceKeep 正在录音"
        }

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_audio)
            .setContentTitle(title)
            .setContentText("点击回到应用可停止录制")
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            var type = when {
                // 录屏：mediaProjection 必需；含麦克风音轨时叠加 microphone（系统按实际使用校验）
                isScreen -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION or
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                // 录像含麦克风音轨：同时声明两种类型
                isVideo -> ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                else -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            }
            if (withLocation) {
                type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            }
            startForeground(NOTIFICATION_ID, notification, type)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        return START_NOT_STICKY
    }

    companion object {
        private const val CHANNEL_ID = "recording_active"
        private const val NOTIFICATION_ID = 1001
        private const val EXTRA_VIDEO = "video"
        private const val EXTRA_SCREEN = "screen"
        private const val EXTRA_LOCATION = "location"

        fun start(context: Context, video: Boolean, withLocation: Boolean) {
            start(context, video = video, screen = false, withLocation = withLocation)
        }

        fun start(context: Context, video: Boolean, screen: Boolean, withLocation: Boolean) {
            val intent = Intent(context, RecordingService::class.java)
                .putExtra(EXTRA_VIDEO, video)
                .putExtra(EXTRA_SCREEN, screen)
                .putExtra(EXTRA_LOCATION, withLocation)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, RecordingService::class.java))
        }
    }
}
