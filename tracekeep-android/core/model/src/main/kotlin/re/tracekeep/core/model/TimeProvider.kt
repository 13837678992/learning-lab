package re.tracekeep.core.model

/**
 * 时间源抽象（可注入，供测试模拟时间跳变）。
 * - [wallMs]：设备墙上时钟，用户/系统可修改，**不可信**；
 * - [monoMs]：单调时钟，单调递增，设备重启后归零。
 * 两者必须分别记录（需求 §4）；不得用其一冒充另一。
 */
interface TimeProvider {
    fun wallMs(): Long
    fun monoMs(): Long
}

object SystemTimeProvider : TimeProvider {
    override fun wallMs(): Long = System.currentTimeMillis()
    override fun monoMs(): Long = System.nanoTime() / 1_000_000
}
