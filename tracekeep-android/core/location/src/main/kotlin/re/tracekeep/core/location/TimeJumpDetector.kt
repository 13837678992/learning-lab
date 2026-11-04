package re.tracekeep.core.location

/**
 * 时间源一致性检测（需求 §4「时间」；阶段 6）。
 *
 * 原理：设备**墙上时钟**（`System.currentTimeMillis`，用户/系统可修改）与**单调时钟**
 * （`System.nanoTime`，单调递增、不受挂钟调整影响，但设备重启后归零）理论上同步推进。
 * 二者差值的**突变**说明期间发生过挂钟调整（或单调时钟基线重置，如重启）。
 *
 * 诚实性边界（不得夸大，写入报告与文档时必须一致）：
 * - 本类只能发现「两次采样之间二者的差值发生了超出阈值的变化」；
 * - 若攻击者能同时篡改两个钟（如 Root 后同时改），或篡改发生在采样间隔内且被掩盖，本类无法发现；
 * - 单调时钟在设备重启后归零：重启后的首次采样必然产生巨大差值，必须由调用方标注为
 *   [TimeAnomalyKind.MONOTONIC_RESET_SUSPECTED] 而非"时间被篡改"——不推测原因。
 */
object TimeJumpDetector {

    /** 默认阈值：两次采样间 |wall−mono| 偏移变化超过 2 秒即记录异常（可配置）。 */
    const val DEFAULT_THRESHOLD_MS: Long = 2_000L

    /**
     * 一次采样的双钟读数。
     * @param wallMs 墙上时钟（Unix 毫秒；**不是可信时间戳**）
     * @param monoMs 单调时钟（毫秒；仅用于比较，不对外当作时间）
     */
    data class Sample(val wallMs: Long, val monoMs: Long) {
        /** 偏移 = 墙钟 − 单调钟；同一引导周期内应保持稳定。 */
        val offsetMs: Long get() = wallMs - monoMs
    }

    /** 单次比较的结论。 */
    sealed interface Verdict {
        /** 与基线一致（偏移变化在阈值内）。 */
        data class Consistent(val offsetDeltaMs: Long) : Verdict

        /**
         * 检测到偏移突变。[deltaMs] 为本次偏移相对基线的变化量（正=<墙钟前跳>/负=<墙钟回拨>）；
         * [kind] 为**可观察到的现象**，不是对原因的断言。
         */
        data class Anomaly(
            val kind: TimeAnomalyKind,
            val deltaMs: Long,
            val baselineOffsetMs: Long,
            val currentOffsetMs: Long,
        ) : Verdict
    }

    /**
     * 比较当前采样与基线（上一次采样），判定是否存在可观察的异常。
     * @param baseline 上一次采样；null 表示首次采样（无可比较基线，返回 [Verdict.Consistent]，
     *   offsetDelta 以当前偏移为参照、不产生异常）。
     */
    fun compare(
        baseline: Sample?,
        current: Sample,
        thresholdMs: Long = DEFAULT_THRESHOLD_MS,
    ): Verdict {
        if (baseline == null) return Verdict.Consistent(0L)
        val delta = current.offsetMs - baseline.offsetMs
        if (kotlin.math.abs(delta) <= thresholdMs) return Verdict.Consistent(delta)
        // 单调钟显著回退（差值缩小到接近当前墙钟量级的负向突变）常出现在设备重启后；
        // 仅作「现象分类」，不作原因断言（调用方与报告需如实照抄该措辞）。
        val kind = if (delta < 0 && current.monoMs < baseline.monoMs) {
            TimeAnomalyKind.MONOTONIC_RESET_SUSPECTED
        } else if (delta > 0) {
            TimeAnomalyKind.WALL_CLOCK_ADVANCED
        } else {
            TimeAnomalyKind.WALL_CLOCK_SET_BACK
        }
        return Verdict.Anomaly(kind, delta, baseline.offsetMs, current.offsetMs)
    }
}

/**
 * 可观察到的时间异常现象（**现象分类，非原因断言**）。
 * 事件日志与报告必须照抄这些措辞，不得写成"时间被篡改"等确定性结论。
 */
enum class TimeAnomalyKind {
    /** 墙钟相对单调钟前跳（观察到：偏移正向突变）。 */
    WALL_CLOCK_ADVANCED,

    /** 墙钟相对单调钟回拨（观察到：偏移负向突变且单调钟未回退）。 */
    WALL_CLOCK_SET_BACK,

    /** 单调钟回退（观察到：单调钟读数变小）——常见于设备重启，但不推测原因。 */
    MONOTONIC_RESET_SUSPECTED,
}
