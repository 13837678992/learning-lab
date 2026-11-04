package re.tracekeep.app.signing

import android.content.Context
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import re.tracekeep.core.crypto.SignatureEngine
import re.tracekeep.core.crypto.SigningException
import re.tracekeep.core.model.KeyDescriptor
import re.tracekeep.core.model.KeyProtectionLevel
import re.tracekeep.core.model.SignatureAlgorithm

/**
 * Android Keystore 签名引擎（需求 §5；阶段 7）。
 *
 * 密钥管理规则（与需求 §5、威胁模型 K 域逐条对应）：
 * - **算法**：EC P-256 + SHA-256（`SHA256withECDSA`），`setDigests(SHA-256)`；
 * - **私钥保护**：`setUserAuthenticationRequired(false)`（当前版本不强制锁屏认证，
 *   如实在 [KeyDescriptor.userAuthenticationRequired] 记录；将来增强可由用户开启）；
 * - **私钥永不导出**：只通过 Keystore 句柄签名；[KeyDescriptor] 仅含公钥与元数据；
 * - **硬件支持如实检测**：解析 [KeyInfo.isInsideSecureHardware] / securityLevel 区分
 *   [KeyProtectionLevel.HARDWARE_BACKED] / [SOFTWARE_BACKED]——**不得把软件级说成硬件级**；
 * - **密钥标识**：keyId = 公钥 X.509 编码的 SHA-256 短指纹；轮换后新 keyId；
 * - **别名映射持久化**：Keystore 别名（随机）与 keyId 的映射存于应用私有目录 registry——
 *   **修复了"生成用时间戳别名、查找用 keyId 派生别名"导致的私钥定位失败缺陷**；
 * - **丢失/卸载行为**：应用卸载或 Keystore 清空后私钥不可恢复；已有签名的公钥在证据包内，
 *   仍可验证（[re.tracekeep.core.crypto.SignatureVerifier]），但**禁止**用新密钥冒充旧 keyId 重签。
 *
 * 已知限制（真机待验）：不同厂商 Keystore 实现与 `isInsideSecureHardware` 行为存在差异；
 * 本类不做任何"密钥来源可信"的断言（本地自签密钥不能证明签署者真实身份）。
 */
class AndroidKeystoreSigner(
    context: Context,
    private val appVersionName: String? = null,
) : SignatureEngine {

    private val registryDir = context.filesDir.resolve("signing")
    private val registryFile = registryDir.resolve("keys.json")

    private val json = Json { encodeDefaults = true; ignoreUnknownKeys = true; prettyPrint = true }

    /** 持久化的密钥条目：描述符 + Keystore 别名（别名不对外暴露语义）。 */
    @Serializable
    private data class StoredKey(val alias: String, val descriptor: KeyDescriptor)

    private fun keyStore(): KeyStore =
        KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

    override fun getOrCreateActiveKey(appVersionName: String?): KeyDescriptor {
        registryDir.mkdirs()
        val stored = loadRegistry()
        val active = stored.lastOrNull { it.descriptor.retiredAtWallMs == null }
        if (active != null && keyStore().containsAlias(active.alias)) {
            return active.descriptor
        }
        return generateKey()
    }

    private fun generateKey(): KeyDescriptor {
        val ks = keyStore()
        val alias = "tracekeep-" + re.tracekeep.core.integrity.Sha256.of(
            System.currentTimeMillis().toString().toByteArray(),
        ).take(16)
        try {
            val kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE)
            val spec = KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
            )
                .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setUserAuthenticationRequired(false)
                .build()
            kpg.initialize(spec)
            val kp = kpg.generateKeyPair()

            val publicKeyBase64 = Base64.getEncoder().encodeToString(kp.public.encoded)
            val keyId = keyIdOf(kp.public.encoded)
            val protection = detectProtectionLevel(ks, alias)
            val now = System.currentTimeMillis()
            val descriptor = KeyDescriptor(
                keyId = keyId,
                algorithm = SignatureAlgorithm.ECDSA_P256_SHA256,
                protectionLevel = protection,
                publicKeyBase64 = publicKeyBase64,
                createdAtWallMs = now,
                validFromWallMs = now,
                userAuthenticationRequired = false,
                appVersionName = appVersionName,
            )
            saveRegistry(loadRegistry() + StoredKey(alias, descriptor))
            return descriptor
        } catch (e: Exception) {
            throw SigningException("key generation failed: ${e.message ?: e::class.simpleName}", e)
        }
    }

    override fun sign(keyId: String, payloadBytes: ByteArray, algorithm: SignatureAlgorithm): String {
        if (algorithm != SignatureAlgorithm.ECDSA_P256_SHA256) {
            throw SigningException("unsupported signature algorithm: $algorithm")
        }
        val stored = loadRegistry().firstOrNull { it.descriptor.keyId == keyId }
            ?: throw SigningException("unknown keyId: $keyId (key lost or rotated)")
        val ks = keyStore()
        if (!ks.containsAlias(stored.alias)) {
            throw SigningException("private key unavailable for keyId=$keyId (lost/cleared); cannot sign")
        }
        return try {
            val privateKey = ks.getKey(stored.alias, null) as PrivateKey
            val sig = Signature.getInstance("SHA256withECDSA")
            sig.initSign(privateKey)
            sig.update(payloadBytes)
            Base64.getEncoder().encodeToString(sig.sign())
        } catch (e: Exception) {
            throw SigningException("signing failed: ${e.message ?: e::class.simpleName}", e)
        }
    }

    override fun listKeys(): List<KeyDescriptor> = loadRegistry().map { it.descriptor }

    // ---------------------------------------------------------------- 内部

    private fun keyIdOf(publicKeyEncoded: ByteArray): String {
        val digest = re.tracekeep.core.integrity.Sha256.of(publicKeyEncoded)
        return "EC-P256-" + digest.take(16).uppercase()
    }

    private fun detectProtectionLevel(ks: KeyStore, alias: String): KeyProtectionLevel {
        return try {
            val privateKey = ks.getKey(alias, null) as PrivateKey
            val factory = KeyFactory.getInstance(privateKey.algorithm, ANDROID_KEYSTORE)
            val info = factory.getKeySpec(privateKey, KeyInfo::class.java) as KeyInfo
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                info.securityLevel == KeyProperties.SECURITY_LEVEL_STRONGBOX
            ) {
                return KeyProtectionLevel.HARDWARE_BACKED
            }
            if (info.isInsideSecureHardware) KeyProtectionLevel.HARDWARE_BACKED
            else KeyProtectionLevel.SOFTWARE_BACKED
        } catch (_: Exception) {
            // 无法判定时按软件级如实报告（不夸大）
            KeyProtectionLevel.SOFTWARE_BACKED
        }
    }

    private fun loadRegistry(): List<StoredKey> {
        val f = registryFile
        if (!f.exists()) return emptyList()
        return try {
            json.decodeFromString<List<StoredKey>>(f.readText())
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun saveRegistry(keys: List<StoredKey>) {
        registryDir.mkdirs()
        val tmp = registryDir.resolve("keys.json.tmp")
        tmp.writeText(json.encodeToString(keys))
        java.nio.file.Files.move(
            tmp.toPath(), registryFile.toPath(),
            java.nio.file.StandardCopyOption.REPLACE_EXISTING,
        )
    }

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    }
}
