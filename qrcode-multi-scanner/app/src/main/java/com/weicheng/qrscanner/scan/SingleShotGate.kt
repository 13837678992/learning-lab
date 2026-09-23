package com.weicheng.qrscanner.scan

import java.util.concurrent.atomic.AtomicBoolean

/**
 * 「只放行一次」闸门，用于解决 CameraX 同一张二维码被连续多帧识别的问题。
 *
 * CameraX 的 ImageAnalysis 每秒会回调几十帧，用户把二维码对准镜头后会连续命中
 * 同一张码。如果直接在有结果时就保存，就会出现「第1张、第1张、第1张」。
 *
 * 处理办法是：识别成功的那一刻就用 [tryConsume] 抢占闸门，抢到的帧才允许上报，
 * 其余并发帧一律丢弃；同时调用方立即停止取景，等待用户手动点「扫描下一张」。
 *
 * 用 `compareAndSet` 而不是「先判断再赋值」，是因为 ML Kit 的回调与帧解析可能
 * 存在并发，两个操作分开写会有竞态窗口，导致仍然重复保存。
 *
 * 每次重新开始扫描时，调用方都会创建一个新的实例（而不是 [reset]），
 * 这样「闸门生命周期 == 一次扫描尝试」的约束由类型本身保证，不依赖调用方自觉。
 */
class SingleShotGate {

    private val consumed = AtomicBoolean(false)

    /** 是否已经被抢占。分析器用它做快速短路，避免无谓的图像转换开销。 */
    val isConsumed: Boolean get() = consumed.get()

    /** 抢占闸门。只有第一个调用者返回 true，后续调用一律返回 false。 */
    fun tryConsume(): Boolean = consumed.compareAndSet(false, true)
}
