package com.weicheng.qrscanner.ui

import androidx.lifecycle.ViewModel
import com.weicheng.qrscanner.domain.JoinStrategy
import com.weicheng.qrscanner.model.ScanSession
import com.weicheng.qrscanner.util.AppLog
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * 全应用共享的扫描状态。
 *
 * 放在 ViewModel 而不是各个 Composable 里，是为了让扫描结果在横竖屏切换、
 * 相机页与列表页来回跳转时都不会丢失——「扫描结果不丢失」是本应用的核心要求之一。
 *
 * 注意：本类只保存内存状态，进程被系统回收后数据会丢失。
 * 持久化（扫描历史）属于第二阶段，见 README。
 */
class ScanViewModel : ViewModel() {

    private val _session = MutableStateFlow(ScanSession())
    val session: StateFlow<ScanSession> = _session.asStateFlow()

    private val _singleResult = MutableStateFlow<String?>(null)
    val singleResult: StateFlow<String?> = _singleResult.asStateFlow()

    /**
     * 最近一次追加到会话中的序号，用于在列表页提示「第 N 张扫描成功」。
     * 用户继续操作后由 [consumeAppendedNotice] 清空。
     */
    private val _lastAppendedIndex = MutableStateFlow<Int?>(null)
    val lastAppendedIndex: StateFlow<Int?> = _lastAppendedIndex.asStateFlow()

    /** 拼接方式。MVP 固定为直接拼接，第二阶段可切换。 */
    val joinStrategy: JoinStrategy = JoinStrategy.Direct

    // ---- 单张扫描 ----

    fun setSingleResult(content: String) {
        _singleResult.value = content
        AppLog.scanSuccess(index = 1, contentLength = content.length)
    }

    fun clearSingleResult() {
        _singleResult.value = null
    }

    // ---- 多张合并 ----

    /** 新建一个扫描任务，丢弃上一次的会话（对应「进入多张合并即创建新任务」）。 */
    fun startNewSession() {
        _session.value = ScanSession()
        _lastAppendedIndex.value = null
    }

    /**
     * 追加一张扫描结果。
     *
     * 这里只做「存」不做「拼」：内容原样保存为独立条目，
     * 拼接推迟到用户点击「完成」时按列表顺序计算。
     */
    fun appendScan(content: String) {
        _session.update { it.append(content) }

        val appended = _session.value.items.lastOrNull() ?: return
        _lastAppendedIndex.value = appended.index
        AppLog.scanSuccess(index = appended.index, contentLength = appended.contentLength)
    }

    fun deleteItem(itemId: String) {
        _session.update { it.delete(itemId) }
        _lastAppendedIndex.value = null
    }

    fun consumeAppendedNotice() {
        _lastAppendedIndex.value = null
    }
}
