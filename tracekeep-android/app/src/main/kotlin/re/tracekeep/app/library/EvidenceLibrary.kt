package re.tracekeep.app.library

import android.content.Context
import re.tracekeep.app.signing.AndroidKeystoreSigner
import re.tracekeep.core.crypto.SigningException
import re.tracekeep.core.model.KeyDescriptor
import re.tracekeep.core.model.SessionState
import re.tracekeep.core.storage.EvidenceStore
import re.tracekeep.core.storage.StorageException
import re.tracekeep.core.verify.CheckResult
import re.tracekeep.core.verify.CheckStatus
import re.tracekeep.core.verify.EvidenceVerifier
import re.tracekeep.core.verify.VerificationReport

/**
 * 本地证据库操作（阶段 7）：封存 + 签名、独立验证。
 *
 * 与录音/录像本地保存（v0.1.2 起独立完成）**互不依赖**：封存签名是保存之后的增强步骤，
 * 不改变"停止即保存"的语义；导出（阶段 9）同样不依赖本类。
 *
 * 诚实性：本类不产生任何"内容真实/法院采信"的结论；验证结果逐项呈现（PASS/FAIL/WARN/SKIPPED）。
 */
object EvidenceLibrary {

    /** 单条结果（供 UI 展示）。 */
    data class OpResult(val ok: Boolean, val message: String, val details: List<String> = emptyList())

    /**
     * 封存 + 签名会话。前置：会话处于 STOPPED 且已保存（saveStatus=SAVED）或 ABORTED。
     * 失败（含签名失败）如实返回，不得标记为成功。
     */
    fun sealAndSign(
        context: Context,
        store: EvidenceStore,
        sessionId: String,
        appVersionName: String?,
    ): OpResult {
        return try {
            val session = store.loadSession(sessionId)
            val alreadySigned = store.loadSignatureRecord(sessionId) != null
            if (session.state == SessionState.SEALED) {
                // 已封存：仅当尚未签名时才补签（修复"封存成功但签名失败后无法补签"的缺陷）
                if (alreadySigned) {
                    return OpResult(true, "该会话已封存并签名（会话 ${short(sessionId)}）")
                }
            } else if (session.state != SessionState.STOPPED && session.state != SessionState.ABORTED) {
                return OpResult(false, "仅已停止/已中断的会话可封存（当前 ${session.state}）")
            }
            val engine = AndroidKeystoreSigner(context, appVersionName)
            store.sealSigned(sessionId, engine, appVersionName)
            val key = engine.getOrCreateActiveKey(appVersionName)
            val signRecord = store.loadSignatureRecord(sessionId)
            val protection = when (key.protectionLevel) {
                re.tracekeep.core.model.KeyProtectionLevel.HARDWARE_BACKED -> "硬件支持（TEE/StrongBox）"
                re.tracekeep.core.model.KeyProtectionLevel.SOFTWARE_BACKED -> "软件实现（非硬件保护）"
                re.tracekeep.core.model.KeyProtectionLevel.EXTERNAL -> "外部密钥"
            }
            OpResult(
                ok = true,
                message = "封存并签名成功（会话 ${short(sessionId)}）",
                details = listOf(
                    "密钥标识：${key.keyId}",
                    "密钥保护级别：$protection",
                    "签名算法：${key.algorithm}",
                    "被签内容摘要：${signRecord?.signedPayloadSha256?.take(16) ?: "?"}…",
                    "说明：本地签名仅证明该内容由对应私钥签署，不代表身份认证或内容真实。",
                ),
            )
        } catch (e: SigningException) {
            OpResult(false, "签名失败：${e.message}（会话未被标记为已签名）")
        } catch (e: StorageException) {
            OpResult(false, "封存失败：${e.message}")
        } catch (e: Exception) {
            OpResult(false, "封存签名异常：${e.message ?: e::class.simpleName}")
        }
    }

    /**
     * 独立验证会话（复用 core:verify 的逐项验证器；仅用包内材料与公钥）。
     * 不依赖原 App 数据库以外的运行时状态，也不使用私钥。
     */
    fun verify(context: Context, store: EvidenceStore, sessionId: String): OpResult {
        return try {
            val formatVersion = store.readSessionFormatVersion(sessionId)
            val files = store.readSessionFiles(sessionId)
            val events = store.readSessionEvents(sessionId)
            val signature = store.loadSignatureRecord(sessionId)
            // 公钥集合：来自本机 Keystore 登记的公钥（验证"本机会话"场景）
            val keys: Map<String, String> = runCatching {
                AndroidKeystoreSigner(context).listKeys().associate { it.keyId to it.publicKeyBase64 }
            }.getOrDefault(emptyMap())

            val report: VerificationReport = EvidenceVerifier().verify(
                EvidenceVerifier.Materials(
                    formatVersion = formatVersion,
                    files = files,
                    fileBytes = { rel ->
                        // 通过 store 读取实际字节（与应用保存路径一致）
                        runCatching { store.readFileBytes(sessionId, rel) }.getOrNull()
                    },
                    events = events.events,
                    skippedEventLines = events.skippedLines,
                    signature = signature,
                    publicKeys = keys,
                    supportedFormatVersion = re.tracekeep.core.model.EvidenceFormat.VERSION,
                ),
            )
            val details = report.results.map { r -> "${statusLabel(r.status)} ${r.title}：${r.detail}" }
            OpResult(
                ok = !report.hasFailure,
                message = "验证完成：PASS ${report.passCount} / FAIL ${report.failCount} / " +
                    "WARN ${report.warnCount} / SKIPPED ${report.skippedCount}",
                details = details,
            )
        } catch (e: Exception) {
            OpResult(false, "验证异常：${e.message ?: e::class.simpleName}")
        }
    }

    private fun statusLabel(s: CheckStatus): String = when (s) {
        CheckStatus.PASS -> "[PASS]"
        CheckStatus.FAIL -> "[FAIL]"
        CheckStatus.WARN -> "[WARN]"
        CheckStatus.SKIPPED -> "[SKIP]"
    }

    private fun short(id: String) = id.take(8)
}
