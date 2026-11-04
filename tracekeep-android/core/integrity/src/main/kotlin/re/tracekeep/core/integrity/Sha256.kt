package re.tracekeep.core.integrity

import java.io.File
import java.io.InputStream
import java.security.MessageDigest

/**
 * 流式 SHA-256（阶段 1 最小实现；阶段 7 扩展哈希链与清单）。
 *
 * 设计约束（PROJECT_REQUIREMENTS.md §5）：
 * - 大文件流式计算，常量内存；
 * - 输出统一为小写十六进制字符串（文档化格式，规范编码的一部分）。
 *
 * 能力边界（不得在界面/报告中夸大）：
 * 哈希只用于比较字节是否一致，不能证明内容真实、来源真实或被法院采信。
 */
object Sha256 {

    const val ALGORITHM: String = "SHA-256"

    /** 分块大小：1 MiB。只影响内存占用，不影响结果。 */
    const val CHUNK_SIZE: Int = 1024 * 1024

    fun hex(bytes: ByteArray): String {
        val out = StringBuilder(bytes.size * 2)
        for (b in bytes) {
            val v = b.toInt() and 0xFF
            out.append(HEX_CHARS[v ushr 4])
            out.append(HEX_CHARS[v and 0x0F])
        }
        return out.toString()
    }

    /** 对内存中的字节数组计算摘要（小数据专用；大文件用 [of] 的流式重载）。 */
    fun of(bytes: ByteArray): String =
        hex(MessageDigest.getInstance(ALGORITHM).digest(bytes))

    fun of(file: File): String = file.inputStream().buffered().use { of(it) }

    /** 流式计算：按 [CHUNK_SIZE] 分块读取，内存占用与文件大小无关。 */
    fun of(input: InputStream): String {
        val digest = MessageDigest.getInstance(ALGORITHM)
        val buffer = ByteArray(CHUNK_SIZE)
        while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            digest.update(buffer, 0, read)
        }
        return hex(digest.digest())
    }

    private val HEX_CHARS = "0123456789abcdef".toCharArray()
}
