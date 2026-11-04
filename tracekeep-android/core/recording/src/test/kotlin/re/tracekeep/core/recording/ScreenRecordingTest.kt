package re.tracekeep.core.recording

import java.nio.ByteBuffer
import java.nio.ByteOrder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * 录屏专项（阶段 5）：WAV 封装正确性与 forScreen 多输出编排。
 * 所有"录制数据"均为测试临时目录中的合成字节，不构成正式证据。
 */
class ScreenRecordingTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    // ------------------------------------------------------------ WavPacker

    @Test
    fun wavHeader_hasCanonicalRiffStructure() {
        val header = WavPacker.buildHeader(dataBytes = 1000, sampleRate = 44_100, channels = 1, bitsPerSample = 16)
        assertEquals(44, header.size)
        val buf = ByteBuffer.wrap(header).order(ByteOrder.LITTLE_ENDIAN)
        val riff = ByteArray(4).also { buf.get(it) }
        val riffSize = buf.int
        val wave = ByteArray(4).also { buf.get(it) }
        val fmt = ByteArray(4).also { buf.get(it) }
        val fmtSize = buf.int
        val format = buf.short
        val channels = buf.short
        val sampleRate = buf.int
        val byteRate = buf.int
        val blockAlign = buf.short
        val bits = buf.short
        val data = ByteArray(4).also { buf.get(it) }
        val dataSize = buf.int

        assertEquals("RIFF", String(riff, Charsets.US_ASCII))
        assertEquals(36 + 1000, riffSize)
        assertEquals("WAVE", String(wave, Charsets.US_ASCII))
        assertEquals("fmt ", String(fmt, Charsets.US_ASCII))
        assertEquals(16, fmtSize)
        assertEquals(1.toShort(), format) // PCM
        assertEquals(1.toShort(), channels)
        assertEquals(44_100, sampleRate)
        assertEquals(88_200, byteRate) // 44100 * 1 * 2
        assertEquals(2.toShort(), blockAlign)
        assertEquals(16.toShort(), bits)
        assertEquals("data", String(data, Charsets.US_ASCII))
        assertEquals(1000, dataSize)
    }

    @Test
    fun wavFinalize_backfillsLengthForPlaceholderFile() {
        val wav = tempFolder.newFile("internal-audio.wav").toPath()
        // 模拟录制过程：44 字节零占位 + 4410 字节 PCM（0.05s @44.1k/16bit mono）
        java.nio.file.Files.write(wav, ByteArray(44) + ByteArray(4410))

        WavPacker.finalizeFile(wav, sampleRate = 44_100, channels = 1, bitsPerSample = 16)

        val bytes = java.nio.file.Files.readAllBytes(wav)
        assertEquals(44 + 4410, bytes.size)
        val buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        val riff = ByteArray(4).also { buf.get(it) }
        assertEquals("RIFF", String(riff, Charsets.US_ASCII))
        buf.position(4); val riffSize = buf.int
        assertEquals(36 + 4410, riffSize)
        buf.position(40) // data size field
        assertEquals(4410, buf.int)
    }

    @Test
    fun wavFinalize_shortFile_unchanged() {
        val wav = tempFolder.newFile("short.wav").toPath()
        java.nio.file.Files.write(wav, ByteArray(10))
        WavPacker.finalizeFile(wav, 44_100, 1, 16)
        assertEquals(10, java.nio.file.Files.readAllBytes(wav).size)
    }

    // ------------------------------------------------------------ forScreen 多输出编排

    private class FakeScreenEngine(
        private val outputs: List<String>,
    ) : RecordingEngine {
        var startFailure: String? = null
        val startedFiles: Map<String, java.nio.file.Path> = mutableMapOf()
        private var files: Map<String, java.nio.file.Path> = emptyMap()

        override fun outputFileNames(): List<String> = outputs

        override fun start(outputFiles: Map<String, java.nio.file.Path>): EngineResult {
            startFailure?.let { return EngineResult.Failure(it) }
            files = outputFiles
            return EngineResult.Ok
        }

        fun writeTo(name: String, bytes: ByteArray = "fake-bytes".toByteArray()) {
            files[name]?.let { java.nio.file.Files.write(it, bytes, java.nio.file.StandardOpenOption.APPEND) }
        }

        override fun stop(): EngineResult = EngineResult.Ok
        override fun abort() {}
    }

    @Test
    fun screenSession_registersBothOutputs_andSavesWithInternalAudio() {
        val store = re.tracekeep.core.storage.EvidenceStore(tempFolder.newFolder("root").toPath())
        val engine = FakeScreenEngine(listOf("screen.mp4", "internal-audio.wav"))
        val c = RecordingController.forScreen(
            store, engine,
            ScreenRecordingConfig(audioSource = ScreenAudioSource.INTERNAL),
        )
        val start = c.start()
        assertTrue(start is RecordingController.Result.Started)
        assertEquals(2, (start as RecordingController.Result.Started).fileIds.size)

        // 两个原始件都被登记，且是独立记录
        val files = store.listFiles(start.sessionId)
        assertEquals(2, files.size)
        assertTrue(files.all { it.role == re.tracekeep.core.model.FileRole.ORIGINAL })

        engine.writeTo("screen.mp4", "fake-mp4-data".toByteArray())
        engine.writeTo("internal-audio.wav", "fake-wav-data".toByteArray())
        val stop = c.stop()
        assertTrue(stop is RecordingController.Result.Saved)
        val session = store.loadSession(start.sessionId)
        assertEquals(re.tracekeep.core.model.SaveStatus.SAVED, session.saveStatus)
        // 两个文件都已封装（finalize）
        assertTrue(store.listFiles(start.sessionId).all { it.sha256 != null })
    }

    @Test
    fun screenSession_internalAudioStartFailure_abortsWholeSession_filesIncomplete() {
        val store = re.tracekeep.core.storage.EvidenceStore(tempFolder.newFolder("root2").toPath())
        val engine = FakeScreenEngine(listOf("screen.mp4", "internal-audio.wav")).apply {
            startFailure = "AudioRecord not initialized (device may disallow playback capture)"
        }
        val c = RecordingController.forScreen(
            store, engine,
            ScreenRecordingConfig(audioSource = ScreenAudioSource.INTERNAL),
        )
        val result = c.start()
        assertTrue(result is RecordingController.Result.StartFailed)
        val sessionId = result.sessionId
        assertEquals(re.tracekeep.core.model.SessionState.ABORTED, store.loadSession(sessionId).state)
        // 全部输出如实标记未完成（不残留"看起来完成"的记录）
        assertTrue(
            store.listFiles(sessionId).all {
                it.lifecycle == re.tracekeep.core.model.FileLifecycle.INCOMPLETE
            },
        )
    }

    @Test
    fun screenSession_noAudio_declaresSingleOutput() {
        val store = re.tracekeep.core.storage.EvidenceStore(tempFolder.newFolder("root3").toPath())
        val engine = FakeScreenEngine(listOf("screen.mp4"))
        val c = RecordingController.forScreen(
            store, engine,
            ScreenRecordingConfig(audioSource = ScreenAudioSource.NONE),
        )
        val start = c.start() as RecordingController.Result.Started
        assertEquals(1, start.fileIds.size)
    }

    @Test
    fun screenConfig_recordsAudioSourceInConfigEvent() {
        val store = re.tracekeep.core.storage.EvidenceStore(tempFolder.newFolder("root4").toPath())
        val engine = FakeScreenEngine(listOf("screen.mp4"))
        val c = RecordingController.forScreen(
            store, engine,
            ScreenRecordingConfig(audioSource = ScreenAudioSource.INTERNAL),
        )
        val sessionId = c.start().sessionId
        val configEvent = store.readEvents(sessionId).events
            .single { it.type == re.tracekeep.core.model.EventTypes.RECORDING_CONFIG }
        assertEquals("\"screen\"", configEvent.payload["kind"]?.toString())
        assertEquals("\"INTERNAL\"", configEvent.payload["audioSource"]?.toString())
        assertEquals(
            re.tracekeep.core.model.RecordingType.SCREEN,
            store.loadSession(sessionId).recordingType,
        )
    }
}
