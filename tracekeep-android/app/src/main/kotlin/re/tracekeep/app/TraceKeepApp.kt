package re.tracekeep.app

import android.app.Application
import android.util.Log
import re.tracekeep.core.storage.EvidenceStore

/**
 * 应用入口：
 * - 创建证据存储（应用私有目录 `filesDir/evidence`）；
 * - 启动时执行崩溃恢复扫描：
 *   ① CREATED/RECORDING/PAUSED → ABORTED（未完成文件如实标记）；
 *   ② "已停止但未保存"（保存过程中进程退出）→ 重试完成本地保存（文件保留、记录补写）。
 *   恢复结果写入会话事件日志；此处仅记录日志行数，不上传、不修改原始材料。
 */
class TraceKeepApp : Application() {

    lateinit var store: EvidenceStore
        private set

    override fun onCreate() {
        super.onCreate()
        store = EvidenceStore(filesDir.toPath().resolve("evidence"))
        runCatching {
            val recovered = store.recoverOnStartup()
            if (recovered.isNotEmpty()) {
                Log.i(TAG, "Recovery scan: ${recovered.size} session(s) marked ABORTED")
            }
        }.onFailure { e ->
            // 恢复扫描失败不得导致应用崩溃；如实记录，材料保持原状。
            Log.e(TAG, "Recovery scan failed: ${e.message}")
        }
        runCatching {
            val saveRecoveries = store.recoverPendingSaves()
            if (saveRecoveries.isNotEmpty()) {
                Log.i(
                    TAG,
                    "Pending-save recovery: ${saveRecoveries.count { it.saved }}/${saveRecoveries.size} saved",
                )
            }
        }.onFailure { e ->
            Log.e(TAG, "Pending-save recovery failed: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "TraceKeepApp"
    }
}
