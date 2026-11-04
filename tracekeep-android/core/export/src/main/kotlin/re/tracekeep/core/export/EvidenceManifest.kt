package re.tracekeep.core.export

import kotlinx.serialization.Serializable

/**
 * 证据包清单（manifest.json；需求 §6）。
 *
 * 清单必须如实披露（不得静默忽略）：
 * - 应用/格式/清单版本、会话 ID、录制类型、设备记录时间；
 * - 每个文件的相对路径 / 大小 / SHA-256 / 角色 / 生命周期；
 * - 事件日志与定位数据的存在性、条数、无法解析行数、哈希；
 * - 哈希链链头哈希与入链事件数（阶段 7 起）；
 * - 签名记录摘要与公钥（阶段 7 起；**不含私钥**）；
 * - 第三方服务状态（阶段 8：未配置时如实写"无"）；
 * - 异常与缺失数据清单。
 *
 * **能力边界**：manifest 只是机器可读索引与事实记录；它不是可信时间证明，
 * 也不证明内容真实或法院采信（见 docs/THREAT_MODEL.md、需求 §12）。
 */
@Serializable
data class EvidenceManifest(
    val manifestVersion: Int = MANIFEST_VERSION,
    /** 证据格式版本（与 session.json 的 formatVersion 一致）。 */
    val formatVersion: Int,
    val appVersionName: String,
    val sessionId: String,
    val recordingType: String,
    val sessionState: String,
    val saveStatus: String?,
    /** 设备记录时间（**非可信时间戳**，如实标注）。 */
    val deviceRecordedAtWallMs: Long,
    val stoppedAtWallMs: Long? = null,
    val savedAtWallMs: Long? = null,
    val sealedAtWallMs: Long? = null,
    val deviceSummary: Map<String, String> = emptyMap(),
    val files: List<ManifestFile> = emptyList(),
    val events: ManifestLog = ManifestLog(),
    val locations: ManifestLog = ManifestLog(),
    val hashChain: ManifestChain = ManifestChain(),
    val signature: ManifestSignature? = null,
    val thirdParty: ManifestThirdParty = ManifestThirdParty(),
    val anomalies: List<String> = emptyList(),
    val missingData: List<String> = emptyList(),
) {
    companion object {
        const val MANIFEST_VERSION: Int = 1
    }
}

@Serializable
data class ManifestFile(
    val relativePath: String,
    val role: String,
    val lifecycle: String,
    val sizeBytes: Long? = null,
    val sha256: String? = null,
    val note: String? = null,
)

@Serializable
data class ManifestLog(
    val present: Boolean = false,
    val count: Long = 0,
    val unparsableLines: Long = 0,
    val sha256: String? = null,
)

@Serializable
data class ManifestChain(
    /** 链头（末条入链事件）哈希；null 表示无入链事件（阶段 7 前历史或空会话）。 */
    val chainHeadHash: String? = null,
    val chainedEventsCount: Long = 0,
    /** 未入链事件数（阶段 7 前历史事件，如实披露）。 */
    val preChainEventsCount: Long = 0,
    val intact: Boolean = true,
)

@Serializable
data class ManifestSignature(
    val objectType: String,
    val objectVersion: Int,
    val algorithm: String,
    val keyId: String,
    /** 密钥保护级别（HARDWARE_BACKED/SOFTWARE_BACKED/EXTERNAL）——如实记录，不夸大。 */
    val keyProtectionLevel: String,
    val signedPayloadSha256: String,
    val signedAtWallMs: Long,
    /** 对应公钥（Base64 SPKI）；**绝不包含私钥**。 */
    val publicKeyBase64: String,
    /** 签名覆盖的文件清单摘要（相对路径 → SHA-256）。 */
    val signedFiles: Map<String, String> = emptyMap(),
)

@Serializable
data class ManifestThirdParty(
    val timestampProvider: String = "none",
    val preservationProvider: String = "none",
    val identityProvider: String = "none",
    /** 诚实声明（未配置时明确"没有第三方时间戳/存证"）。 */
    val statement: String = "未包含第三方时间戳/存证/身份认证。",
)
