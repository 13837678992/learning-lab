package re.tracekeep.core.recording

import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.file.Path

/**
 * PCM WAV 封装工具（纯 JVM；录屏内部音频轨输出为 WAV 原始件）。
 *
 * 背景（需求 §3 录屏）：内部音频经 AudioRecord 捕获为 PCM 字节流，
 * 为保持"原始件可独立播放/复核"，以标准 44 字节 WAV 头封装为 `.wav` 文件，
 * 与屏幕视频并列登记为独立原始件（不混流、不转码）。
 */
object WavPacker {

    const val HEADER_SIZE: Int = 44

    /** 生成标准 PCM WAV 头（小端；dataBytes 为纯 PCM 数据字节数）。 */
    fun buildHeader(dataBytes: Int, sampleRate: Int, channels: Int, bitsPerSample: Int): ByteArray {
        require(dataBytes >= 0) { "dataBytes must be >= 0" }
        require(sampleRate > 0 && channels > 0 && bitsPerSample > 0) { "invalid wav parameters" }
        val byteRate = sampleRate * channels * bitsPerSample / 8
        val blockAlign = channels * bitsPerSample / 8
        val header = ByteBuffer.allocate(HEADER_SIZE).order(ByteOrder.LITTLE_ENDIAN)
        header.put("RIFF".toByteArray(Charsets.US_ASCII))
        header.putInt(36 + dataBytes)
        header.put("WAVE".toByteArray(Charsets.US_ASCII))
        header.put("fmt ".toByteArray(Charsets.US_ASCII))
        header.putInt(16) // PCM fmt chunk size
        header.putShort(1) // PCM format
        header.putShort(channels.toShort())
        header.putInt(sampleRate)
        header.putInt(byteRate)
        header.putShort(blockAlign.toShort())
        header.putShort(bitsPerSample.toShort())
        header.put("data".toByteArray(Charsets.US_ASCII))
        header.putInt(dataBytes)
        return header.array()
    }

    /**
     * 回填已写 WAV 文件的头部长度字段（录制结束时调用；文件此前以 [HEADER_SIZE] 个零字节占位）。
     * 文件长度不足头部时不做任何修改（保持现状，由校验流程如实暴露异常）。
     */
    fun finalizeFile(wavFile: Path, sampleRate: Int, channels: Int, bitsPerSample: Int) {
        val size = wavFile.toFile().length()
        if (size < HEADER_SIZE) return
        RandomAccessFile(wavFile.toFile(), "rw").use { raf ->
            val header = buildHeader(
                dataBytes = (size - HEADER_SIZE).toInt(),
                sampleRate = sampleRate,
                channels = channels,
                bitsPerSample = bitsPerSample,
            )
            raf.seek(0)
            raf.write(header)
        }
    }
}
