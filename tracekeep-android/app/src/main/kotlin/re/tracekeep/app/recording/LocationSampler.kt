package re.tracekeep.app.recording

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Looper
import androidx.compose.runtime.mutableStateOf
import androidx.core.content.ContextCompat
import re.tracekeep.core.recording.LocationSnapshot
import re.tracekeep.core.recording.LocationWatermarkState

/**
 * 前台定位采样器（需求 §4；仅使用「使用中」定位权限，不申请后台定位）。
 *
 * 真实性约束：
 * - 仅发布系统定位回调/最近已知位置中**实际取得**的结果（坐标、精度、定位时间、提供方均来自系统 `Location`）；
 * - 未启用 → [LocationWatermarkState.DISABLED]；已启用但尚未取得 → [LocationWatermarkState.SEARCHING]；
 *   权限缺失/提供方关闭/异常 → [LocationWatermarkState.UNAVAILABLE]；**任何状态都不补造坐标**。
 *
 * 采样期间应用持有录音/录像前台服务（含 location 类型），属"使用中"场景；
 * 会话结束（stop/abort）由持有器调用 [stop] 停止更新。
 */
class LocationSampler(private val context: Context) {

    private val manager: LocationManager? =
        context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager

    /** 当前定位状态（Compose 可观察；水印渲染器从 [current] 读取）。 */
    val snapshot = mutableStateOf(LocationSnapshot.DISABLED)

    /** 每个实际定位结果回调（主线程）；用于写入会话 locations.jsonl。 */
    @Volatile
    var onFix: ((LocationSnapshot) -> Unit)? = null

    /** 渲染线程读取用（不经过 Compose 快照系统）。 */
    @Volatile
    var current: LocationSnapshot = LocationSnapshot.DISABLED
        private set

    private var listening = false

    private val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) = publish(location)
        @Deprecated("Deprecated in Java")
        override fun onProviderDisabled(provider: String) {
            if (snapshot.value.state == LocationWatermarkState.FIXED) return
            update(LocationSnapshot.UNAVAILABLE)
        }
    }

    fun hasPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    /** 开始采样。[userEnabled] 为会话开始时的用户开关状态。 */
    fun start(userEnabled: Boolean) {
        stop()
        if (!userEnabled) {
            update(LocationSnapshot.DISABLED)
            return
        }
        val mgr = manager
        if (mgr == null || !hasPermission()) {
            update(LocationSnapshot.UNAVAILABLE)
            return
        }
        update(LocationSnapshot.SEARCHING)
        try {
            // 最近已知位置（可能为空；仅用作首帧即有的实际结果）
            for (provider in PROVIDERS) {
                runCatching { mgr.getLastKnownLocation(provider) }
                    .getOrNull()
                    ?.let { publish(it) }
            }
            var requested = false
            for (provider in PROVIDERS) {
                val enabled = runCatching { mgr.isProviderEnabled(provider) }.getOrDefault(false)
                if (enabled) {
                    mgr.requestLocationUpdates(
                        provider, MIN_TIME_MS, MIN_DISTANCE_M, listener, Looper.getMainLooper(),
                    )
                    requested = true
                }
            }
            listening = requested
            if (!requested && current.state != LocationWatermarkState.FIXED) {
                update(LocationSnapshot.UNAVAILABLE)
            }
        } catch (_: SecurityException) {
            update(LocationSnapshot.UNAVAILABLE)
        } catch (_: Exception) {
            update(LocationSnapshot.UNAVAILABLE)
        }
    }

    /** 停止采样并复位为未启用（会话结束）。 */
    fun stop() {
        val mgr = manager
        if (mgr != null && listening) {
            runCatching { mgr.removeUpdates(listener) }
        }
        listening = false
        update(LocationSnapshot.DISABLED)
    }

    private fun publish(location: Location) {
        val snap = LocationSnapshot(
            state = LocationWatermarkState.FIXED,
            latitude = location.latitude,
            longitude = location.longitude,
            accuracyMeters = if (location.hasAccuracy()) location.accuracy else null,
            fixWallMs = location.time.takeIf { it > 0L },
            provider = location.provider,
        )
        update(snap)
        onFix?.invoke(snap)
    }

    private fun update(next: LocationSnapshot) {
        current = next
        snapshot.value = next
    }

    companion object {
        private val PROVIDERS = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
        private const val MIN_TIME_MS = 5_000L
        private const val MIN_DISTANCE_M = 5f
    }
}
