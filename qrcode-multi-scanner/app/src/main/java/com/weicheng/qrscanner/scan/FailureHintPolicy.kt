package com.weicheng.qrscanner.scan

/** [FailureHintPolicy.onFrame] 的返回值：调用方只需要在 SHOW/HIDE 时动 UI。 */
enum class HintChange { NONE, SHOW, HIDE }

/**
 * 「持续没扫出来」的提示策略。
 *
 * 高容量二维码本来就需要几帧、一次自动对焦、或者用户稍微动一下手机才能识别出来。
 * 所以第一帧失败绝不能弹提示——那样只会让用户以为扫不了而放弃。
 * 只有在**连续一段时间**都没有识别成功时，才值得给出「靠近一些」这类引导。
 *
 * 两个设计要点：
 *
 * 1. **用帧时间戳计时，不用帧计数。** 帧率在不同设备/不同光照下从 15fps 到 30fps 不等，
 *    用计数会让「几秒后提示」的延迟随设备漂移，时间戳不会。
 *
 * 2. **返回 [HintChange] 而不是布尔值。** 这是防刷屏的结构性保证：调用方只在
 *    SHOW/HIDE 那一次才去改 UI 状态，所以哪怕 30fps 连续跑一分钟，整次扫描
 *    对 UI 的写入也**最多只有两次**，不需要在调用方再写节流逻辑。
 *
 * 纯逻辑、无 `android.*` 依赖，可直接用 JVM 单元测试覆盖。
 */
class FailureHintPolicy(
    private val thresholdNanos: Long = SCAN_HINT_DELAY_NANOS,
) {

    /** 提示当前是否应该显示。 */
    var isVisible: Boolean = false
        private set

    /** 是否已经开始计时（第一帧才开始计时，避免把页面初始化的时间算进去）。 */
    private var started = false

    /** 本轮的起点时间戳。 */
    private var startedAtNanos = 0L

    /**
     * 每帧调用一次。
     *
     * @param timestampNanos 该帧的采集时间戳（`ImageInfo.getTimestamp()`，单位纳秒）。
     * @param decoded 这一帧是否成功解出了二维码。
     */
    fun onFrame(timestampNanos: Long, decoded: Boolean): HintChange {
        if (decoded) {
            started = false
            return if (isVisible) {
                isVisible = false
                HintChange.HIDE
            } else {
                HintChange.NONE
            }
        }

        if (!started) {
            started = true
            startedAtNanos = timestampNanos
            return HintChange.NONE
        }

        // 已经显示了就没有变化，不必再通知 UI。
        if (isVisible) return HintChange.NONE

        val elapsed = timestampNanos - startedAtNanos
        // 时间戳理论上单调递增。真回退了（跨重启的时钟源切换等）就重新计时，
        // 而不是让 elapsed 变成负数、把提示卡在永远不显示的状态。
        if (elapsed < 0L) {
            startedAtNanos = timestampNanos
            return HintChange.NONE
        }

        return if (elapsed >= thresholdNanos) {
            isVisible = true
            HintChange.SHOW
        } else {
            HintChange.NONE
        }
    }

    companion object {
        /**
         * 多久没扫出来才提示。
         *
         * 取 5 秒：短于此用户往往还在举稳手机、自动对焦还没收敛，
         * 此时提示会显得聒噪；长于此用户已经开始怀疑是不是扫不出来了。
         */
        const val SCAN_HINT_DELAY_NANOS: Long = 5_000_000_000L
    }
}
