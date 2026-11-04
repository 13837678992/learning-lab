package re.tracekeep.core.storage

import java.io.IOException
import java.nio.ByteBuffer
import java.nio.channels.FileChannel
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.nio.file.StandardOpenOption
import java.util.UUID

/**
 * 文件原子写与追加写工具（需求 §5：临时文件 + 原子提交；禁止覆盖式编辑）。
 *
 * - [write]：先写同目录临时文件并 fsync，再原子移动替换目标。仅用于会话账本类文件
 *   （session.json / files.json / seal.json）的整体重写；
 *   **媒体原始文件一律不经过本方法改写**。
 * - [appendLine]：以追加模式写一行并 fsync（events.log / locations.jsonl）。
 */
internal object AtomicFiles {

    fun write(target: Path, bytes: ByteArray) {
        val dir = target.parent ?: throw IOException("no parent dir for $target")
        Files.createDirectories(dir)
        val tmp = dir.resolve("${target.fileName}.tmp-${UUID.randomUUID()}")
        try {
            FileChannel.open(tmp, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE).use { ch ->
                ch.write(ByteBuffer.wrap(bytes))
                ch.force(true)
            }
            try {
                Files.move(tmp, target, StandardCopyOption.ATOMIC_MOVE)
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING)
            }
        } finally {
            Files.deleteIfExists(tmp)
        }
        fsyncDirectoryBestEffort(dir)
    }

    fun appendLine(target: Path, line: ByteArray) {
        val dir = target.parent ?: throw IOException("no parent dir for $target")
        Files.createDirectories(dir)
        val payload = line.copyOf(line.size + 1).also { it[line.size] = '\n'.code.toByte() }
        FileChannel.open(
            target,
            StandardOpenOption.CREATE,
            StandardOpenOption.WRITE,
            StandardOpenOption.APPEND,
        ).use { ch ->
            ch.write(ByteBuffer.wrap(payload))
            ch.force(true)
        }
        fsyncDirectoryBestEffort(dir)
    }

    /** 目录 fsync 为尽力而为：并非所有平台/文件系统都支持对目录强制同步，失败不视为错误。 */
    private fun fsyncDirectoryBestEffort(dir: Path) {
        try {
            FileChannel.open(dir, StandardOpenOption.READ).use { it.force(true) }
        } catch (_: Exception) {
            // 尽力而为（见 KDoc 与 docs/THREAT_MODEL.md F-1/F-2 对残余风险的说明）。
        }
    }
}
