package re.tracekeep.core.recording

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * 水印中的定位状态（需求：定位失败/未取得时不得显示虚假坐标）。
 */
enum class LocationWatermarkState {
    /** 用户未启用位置记录。 */
    DISABLED,

    /** 已启用，尚未取得定位结果。 */
    SEARCHING,

    /** 已取得实际定位结果（坐标与精度来自系统定位回调，非推算）。 */
    FIXED,

    /** 定位不可用（权限被拒/系统定位关闭/读取失败）。 */
    UNAVAILABLE,
}

/**
 * 定位快照（供水印与界面展示；字段全部来自实际系统定位结果或明确的缺失状态）。
 */
data class LocationSnapshot(
    val state: LocationWatermarkState,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val accuracyMeters: Float? = null,
    /** 定位结果自带的定位时间（系统 `Location.getTime()`）。 */
    val fixWallMs: Long? = null,
    /** 定位提供方名称（如 "gps"/"network"；设备未提供时为 null）。 */
    val provider: String? = null,
) {
    companion object {
        val DISABLED = LocationSnapshot(LocationWatermarkState.DISABLED)
        val SEARCHING = LocationSnapshot(LocationWatermarkState.SEARCHING)
        val UNAVAILABLE = LocationSnapshot(LocationWatermarkState.UNAVAILABLE)
    }
}

/**
 * 水印数据（每帧渲染时构造；[nowWallMs] 由渲染器在绘制瞬间填充设备墙上时钟）。
 *
 * 时间字段含义（不得混淆，需求 §4）：
 * - [nowWallMs]：设备当前墙上时间（**不是可信时间戳**），标签为「设备时间」；
 * - [startWallMs]：本会话录制开始时的设备时间，标签为「起录」；
 * - [LocationSnapshot.fixWallMs]：定位结果自带时间，标签为「定位」，与画面时间可能不同。
 */
data class WatermarkData(
    val sessionLabel: String,
    val startWallMs: Long,
    val zoneId: ZoneId,
    val nowWallMs: Long = 0L,
    val paused: Boolean = false,
    val location: LocationSnapshot = LocationSnapshot.DISABLED,
)

/**
 * 视频水印文本工厂（纯 JVM，可单元测试）。
 *
 * 真实性约束（需求 §3 水印节）：
 * - 时间一律显式携带时区偏移（如 `+08:00`），来源为设备系统时钟与时区设置（如实标注为「设备时间」）；
 * - 定位仅在实际取得结果时显示坐标与精度 + 定位时间；未启用/定位中/不可用分别显示
 *   「位置 未启用」「位置 定位中…」「位置 不可用」——**不生成任何虚假经纬度或地名**；
 * - 会话编号使用本地会话 ID 的短形式（TK-XXXXXXXX），仅作本地记录编号，不代表任何外部认证。
 */
object WatermarkTextFactory {

    private val DATE_TIME: DateTimeFormatter =
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss xxx", Locale.ROOT)

    private val TIME_ONLY: DateTimeFormatter =
        DateTimeFormatter.ofPattern("HH:mm:ss xxx", Locale.ROOT)

    /** 生成水印文本行（顺序固定：REC 行、设备时间、起录时间、位置行）。 */
    fun lines(data: WatermarkData): List<String> {
        val lines = mutableListOf<String>()
        val recPrefix = if (data.paused) "暂停中" else "● REC"
        lines += "$recPrefix · ${data.sessionLabel}"
        lines += "设备时间 " + format(data.nowWallMs, data.zoneId, DATE_TIME)
        lines += "起录 " + format(data.startWallMs, data.zoneId, DATE_TIME)
        lines += locationLine(data)
        return lines
    }

    private fun locationLine(data: WatermarkData): String {
        val loc = data.location
        return when (loc.state) {
            LocationWatermarkState.DISABLED -> "位置 未启用"
            LocationWatermarkState.SEARCHING -> "位置 定位中…"
            LocationWatermarkState.UNAVAILABLE -> "位置 不可用"
            LocationWatermarkState.FIXED -> {
                val lat = loc.latitude ?: return "位置 不可用"
                val lon = loc.longitude ?: return "位置 不可用"
                val acc = loc.accuracyMeters?.let { " ±${it.toInt()}m" } ?: ""
                val fix = loc.fixWallMs?.let { "（定位 " + format(it, data.zoneId, TIME_ONLY) + "）" } ?: ""
                "位置 ${"%.6f".format(Locale.ROOT, lat)}, ${"%.6f".format(Locale.ROOT, lon)}$acc$fix"
            }
        }
    }

    private fun format(ms: Long, zone: ZoneId, formatter: DateTimeFormatter): String =
        formatter.format(Instant.ofEpochMilli(ms).atZone(zone))

    /** 会话 ID → 本地记录编号短形式（如 `TK-3F8A21B7`）；无法解析时返回 `TK-UNKNOWN`。 */
    fun shortSessionLabel(sessionId: String): String {
        val hex = sessionId.filter { it.isLetterOrDigit() }.take(8).uppercase(Locale.ROOT)
        return if (hex.isEmpty()) "TK-UNKNOWN" else "TK-$hex"
    }
}
