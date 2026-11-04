package re.tracekeep.core.recording

import java.nio.file.Path

/**
 * 媒体参数读回接口（停止后尽力读取**实际输出**；需求 §3：记录真实编码/采样率/声道等）。
 *
 * 契约：
 * - 返回的键值必须是实际读回的观察值（如 sampleRateHz/channelCount/bitRateBps/durationMs/mime）；
 * - 无法读取的字段**不得编造**——直接省略该键；
 * - 读取失败抛出异常，由调用方如实记录（readable=false），不得影响「录制已停止」这一事实。
 */
fun interface MediaInspector {
    fun inspect(file: Path): Map<String, String>
}
