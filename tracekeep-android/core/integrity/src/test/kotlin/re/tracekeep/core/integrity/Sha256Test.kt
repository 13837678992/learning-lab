package re.tracekeep.core.integrity

import java.io.ByteArrayInputStream
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * SHA-256 固定测试向量（来源：NIST FIPS 180-4 附录 B 与经典公开向量）。
 * 破坏性/边界测试在阶段 7 扩展（篡改、链、清单），本文件只验证基础正确性与流式一致性。
 */
class Sha256Test {

    @get:Rule
    val tempFolder = TemporaryFolder()

    @Test
    fun emptyInput_matchesNistVector() {
        assertEquals(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            Sha256.of(ByteArray(0)),
        )
    }

    @Test
    fun abc_matchesNistVector() {
        assertEquals(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            Sha256.of("abc".toByteArray(Charsets.US_ASCII)),
        )
    }

    @Test
    fun multiBlockMessage_matchesNistVector() {
        val message = "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"
        assertEquals(
            "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
            Sha256.of(message.toByteArray(Charsets.US_ASCII)),
        )
    }

    @Test
    fun millionAs_matchesNistVector() {
        val data = ByteArray(1_000_000) { 'a'.code.toByte() }
        assertEquals(
            "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
            Sha256.of(data),
        )
    }

    @Test
    fun streamHash_equalsOneShotHash_acrossChunkBoundaries() {
        // 2.5 MiB 数据跨越多个 1 MiB 分块，验证流式读取与一次性计算一致
        val size = 2 * Sha256.CHUNK_SIZE + Sha256.CHUNK_SIZE / 2
        val data = ByteArray(size) { (it * 31 % 251).toByte() }
        val oneShot = Sha256.of(data)
        val streamed = Sha256.of(ByteArrayInputStream(data))
        assertEquals(oneShot, streamed)
    }

    @Test
    fun fileHash_equalsByteArrayHash() {
        val data = "tracekeep-stage1".toByteArray(Charsets.UTF_8)
        val file = tempFolder.newFile("sample.bin")
        file.writeBytes(data)
        assertEquals(Sha256.of(data), Sha256.of(file as File))
    }

    @Test
    fun hexOutput_isLowercaseHexOfFixedLength() {
        val digest = Sha256.of("x".toByteArray())
        assertEquals(64, digest.length)
        assertEquals(digest.lowercase(), digest)
    }
}
