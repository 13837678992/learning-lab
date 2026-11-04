package re.tracekeep.core.recording

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardOpenOption
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import re.tracekeep.core.model.EventSource
import re.tracekeep.core.model.EventTypes
import re.tracekeep.core.model.FileLifecycle
import re.tracekeep.core.model.FileRole
import re.tracekeep.core.model.SessionState
import re.tracekeep.core.model.VerificationStatus
import re.tracekeep.core.storage.EvidenceStore

/**
 * 录音编排控制器测试：Fake 引擎模拟成功与各类故障（阶段 3 核心验收）。
 * 所有"录音数据"均为测试临时目录中的合成字节，不构成正式证据。
 */
class RecordingControllerTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var store: EvidenceStore
    private lateinit var root: Path

    private val config = AudioRecordingConfig(
        codec = "AAC",
        container = "MPEG_4",
        sampleRateHz = 44100,
        channelCount = 1,
        bitRateBps = 128_000,
    )

    /** 可编程 Fake 引擎：按脚本返回结果；start 成功时写入模拟音频字节。 */
    private class FakeEngine(
        var startFailure: String? = null,
        var pauseFailure: String? = null,
        var resumeFailure: String? = null,
        var stopFailure: String? = null,
        var bytesToWrite: ByteArray = "fake-audio-payload".toByteArray(),
    ) : RecordingEngine {
        var aborted = false
        private var target: Path? = null

        override fun outputFileNames(): List<String> = listOf("media.m4a")

        override fun start(outputFiles: Map<String, Path>): EngineResult {
            val targetFile = outputFiles.values.first()
            startFailure?.let { return EngineResult.Failure(it) }
            target = targetFile
            return EngineResult.Ok
        }

        /** 模拟用户停止前的持续写入。 */
        fun writeBytes() {
            target?.let { Files.write(it, bytesToWrite, StandardOpenOption.APPEND) }
        }

        override fun pause(): EngineResult = pauseFailure?.let { EngineResult.Failure(it) } ?: EngineResult.Ok
        override fun resume(): EngineResult = resumeFailure?.let { EngineResult.Failure(it) } ?: EngineResult.Ok
        override fun stop(): EngineResult = stopFailure?.let { EngineResult.Failure(it) } ?: EngineResult.Ok
        override fun abort() { aborted = true }
    }

    @Before
    fun setUp() {
        root = tempFolder.newFolder("evidence-root").toPath()
        store = EvidenceStore(root)
    }

    private fun controller(engine: FakeEngine) =
        RecordingController.forAudio(store, engine, config)

    // ------------------------------------------------------------ 成功路径

    @Test
    fun start_pause_resume_stop_happyPath() {
        val engine = FakeEngine()
        val c = controller(engine)

        val start = c.start()
        assertTrue(start is RecordingController.Result.Started)
        val sessionId = start.sessionId
        assertEquals(SessionState.RECORDING, store.loadSession(sessionId).state)

        engine.writeBytes()
        assertTrue(c.pause() is RecordingController.Result.Paused)
        assertEquals(SessionState.PAUSED, store.loadSession(sessionId).state)

        assertTrue(c.resume() is RecordingController.Result.Resumed)
        assertEquals(SessionState.RECORDING, store.loadSession(sessionId).state)

        engine.writeBytes()
        val stop = c.stop()
        // 停止即保存：成功后必须是 Saved（唯一可显示"保存成功"的结果）
        assertTrue(stop is RecordingController.Result.Saved)
        val saved = stop as RecordingController.Result.Saved
        assertEquals(SessionState.STOPPED, store.loadSession(sessionId).state)

        // 封装完成后再计算最终哈希：必须与文件实际字节一致
        val record = store.listFiles(sessionId).single()
        assertEquals(FileLifecycle.FINALIZED, record.lifecycle)
        assertNotNull(saved.sha256)
        assertEquals(record.sha256, saved.sha256)
        assertEquals(VerificationStatus.PASS, store.verifyFile(sessionId, record.fileId))

        // 保存状态已持久化到会话
        val session = store.loadSession(sessionId)
        assertEquals(re.tracekeep.core.model.SaveStatus.SAVED, session.saveStatus)
        assertNotNull(session.savedAtWallMs)
        assertNotNull(session.stoppedAtWallMs)

        // 事件序列完整（封装完成事件先行，RECORDING_ENGINE_STOPPED 携带封装后的哈希）
        val types = store.readEvents(sessionId).events.map { it.type }
        assertEquals(
            listOf(
                EventTypes.SESSION_CREATED,
                EventTypes.RECORDING_CONFIG,
                EventTypes.FILE_REGISTERED,
                EventTypes.SESSION_STARTED,
                EventTypes.SESSION_PAUSED,
                EventTypes.SESSION_RESUMED,
                EventTypes.FILE_FINALIZED,
                EventTypes.RECORDING_ENGINE_STOPPED,
                EventTypes.SESSION_STOPPED,
                EventTypes.RECORDING_SAVED,
            ),
            types,
        )
    }

    @Test
    fun configEvent_marksRequestedTrue() {
        val c = controller(FakeEngine())
        val sessionId = c.start().sessionId
        val configEvent = store.readEvents(sessionId).events
            .single { it.type == EventTypes.RECORDING_CONFIG }
        assertEquals("true", configEvent.payload["requested"]?.toString())
        assertEquals("\"AAC\"", configEvent.payload["codec"]?.toString())
    }

    @Test
    fun stop_recordsObservedMediaParameters_separateFromRequested() {
        val engine = FakeEngine()
        val inspector = MediaInspector { file ->
            assertTrue(Files.exists(file))
            mapOf("sampleRateHz" to "44100", "channelCount" to "1", "durationMs" to "1234")
        }
        val c = RecordingController.forAudio(store, engine, config, inspector = inspector)
        val sessionId = c.start().sessionId
        engine.writeBytes()
        c.stop()

        val observed = store.readEvents(sessionId).events
            .single { it.type == EventTypes.MEDIA_PARAMETERS_OBSERVED }
        assertEquals("true", observed.payload["observed"]?.toString())
        assertEquals("\"1234\"", observed.payload["durationMs"]?.toString())
    }

    @Test
    fun stop_inspectorFailure_recordedWithoutAffectingStop() {
        val engine = FakeEngine()
        val inspector = MediaInspector { throw IllegalStateException("cannot read container") }
        val c = RecordingController.forAudio(store, engine, config, inspector = inspector)
        val sessionId = c.start().sessionId
        engine.writeBytes()

        val result = c.stop()
        assertTrue(result is RecordingController.Result.Saved)
        assertEquals(SessionState.STOPPED, store.loadSession(sessionId).state)

        val observed = store.readEvents(sessionId).events
            .single { it.type == EventTypes.MEDIA_PARAMETERS_OBSERVED }
        assertEquals("false", observed.payload["readable"]?.toString())
    }

    // ------------------------------------------------------------ 故障路径

    @Test
    fun engineStartFailure_abortsSession_fileIncomplete_notDisguisedAsSuccess() {
        val engine = FakeEngine(startFailure = "device busy")
        val c = controller(engine)

        val result = c.start()
        assertTrue(result is RecordingController.Result.StartFailed)
        val sessionId = result.sessionId

        assertEquals(SessionState.ABORTED, store.loadSession(sessionId).state)
        val record = store.listFiles(sessionId).single()
        assertEquals(FileLifecycle.INCOMPLETE, record.lifecycle)
        assertNull(record.sha256)

        val types = store.readEvents(sessionId).events.map { it.type }
        assertTrue(types.contains(EventTypes.ENGINE_ACTION_FAILED))
        assertTrue(types.contains(EventTypes.FILE_INCOMPLETE))
        assertTrue(types.contains(EventTypes.SESSION_ABORTED))
    }

    @Test
    fun engineStopFailure_marksIncomplete_andAborts() {
        val engine = FakeEngine(stopFailure = "muxer failed")
        val c = controller(engine)
        val sessionId = c.start().sessionId
        engine.writeBytes()

        val stop = c.stop()
        assertTrue(stop is RecordingController.Result.StopFailed)
        assertEquals(SessionState.ABORTED, store.loadSession(sessionId).state)
        val record = store.listFiles(sessionId).single()
        assertEquals(FileLifecycle.INCOMPLETE, record.lifecycle)
        assertNull(record.sha256)
    }

    @Test
    fun pauseFailure_recorded_stateUnchanged() {
        val engine = FakeEngine(pauseFailure = "not supported")
        val c = controller(engine)
        val sessionId = c.start().sessionId

        val result = c.pause()
        assertTrue(result is RecordingController.Result.ActionFailed)
        assertEquals("pause", (result as RecordingController.Result.ActionFailed).action)
        // 会话保持 RECORDING（不因引擎拒绝暂停而改变状态）
        assertEquals(SessionState.RECORDING, store.loadSession(sessionId).state)
        assertTrue(
            store.readEvents(sessionId).events.any { it.type == EventTypes.ENGINE_ACTION_FAILED },
        )
    }

    @Test
    fun resumeFailure_recorded() {
        val engine = FakeEngine(resumeFailure = "device lost")
        val c = controller(engine)
        val sessionId = c.start().sessionId
        c.pause()

        val result = c.resume()
        assertTrue(result is RecordingController.Result.ActionFailed)
        assertEquals(SessionState.PAUSED, store.loadSession(sessionId).state)
    }

    @Test
    fun onEngineError_midRecording_abortsAndMarksIncomplete() {
        val engine = FakeEngine()
        val c = controller(engine)
        val sessionId = c.start().sessionId
        engine.writeBytes()

        c.onEngineError("microphone unplugged")

        assertTrue(engine.aborted)
        assertEquals(SessionState.ABORTED, store.loadSession(sessionId).state)
        val record = store.listFiles(sessionId).single()
        assertEquals(FileLifecycle.INCOMPLETE, record.lifecycle)
        val errorEvent = store.readEvents(sessionId).events
            .single { it.type == EventTypes.RECORDING_ENGINE_ERROR }
        assertEquals(EventSource.SYSTEM_CALLBACK, errorEvent.source)
    }

    @Test
    fun onPermissionRevoked_isRecordedAsEngineError() {
        val c = controller(FakeEngine())
        val sessionId = c.start().sessionId
        c.onPermissionRevoked()
        assertEquals(SessionState.ABORTED, store.loadSession(sessionId).state)
        val errorEvent = store.readEvents(sessionId).events
            .single { it.type == EventTypes.RECORDING_ENGINE_ERROR }
        assertTrue(errorEvent.payload["reason"].toString().contains("permission"))
    }

    @Test
    fun userCancel_abortsButKeepsBytesForAudit() {
        val engine = FakeEngine()
        val c = controller(engine)
        val start = c.start() as RecordingController.Result.Started
        engine.writeBytes()

        val result = c.abortUserCancelled()
        assertTrue(result is RecordingController.Result.Aborted)
        assertTrue(engine.aborted)
        assertEquals(SessionState.ABORTED, store.loadSession(start.sessionId).state)

        // 已写入的字节保留在原始文件中（不删除、不覆盖；如实标记 INCOMPLETE）
        val record = store.listFiles(start.sessionId).single()
        assertEquals(FileLifecycle.INCOMPLETE, record.lifecycle)
        val file = root.resolve("sessions/${start.sessionId}/${record.relativePath}")
        assertEquals("fake-audio-payload", String(Files.readAllBytes(file)))
    }

    // ------------------------------------------------------------ 编排约束

    @Test(expected = IllegalStateException::class)
    fun doubleStart_rejected() {
        val c = controller(FakeEngine())
        c.start()
        c.start()
    }

    @Test(expected = IllegalStateException::class)
    fun stopWithoutStart_rejected() {
        controller(FakeEngine()).stop()
    }

    @Test
    fun sessionAfterStop_canBeSealed_withNoAnomalies() {
        val engine = FakeEngine()
        val c = controller(engine)
        val sessionId = c.start().sessionId
        engine.writeBytes()
        c.stop()

        val seal = store.seal(sessionId)
        assertFalse(seal.record.sealedWithAnomalies)
        assertEquals(VerificationStatus.PASS, seal.record.files.single().verification)
        assertTrue(store.verifySeal(sessionId).allMatch)
    }

    @Test
    fun sessionAfterAbort_canBeSealed_withAnomaliesFlagged() {
        val engine = FakeEngine()
        val c = controller(engine)
        val sessionId = c.start().sessionId
        engine.writeBytes()
        c.onEngineError("storage full")

        val seal = store.seal(sessionId)
        assertTrue(seal.record.sealedWithAnomalies)
        assertEquals(SessionState.ABORTED, seal.record.sealedFromState)
    }

    // ------------------------------------------------------------ 摄像头（阶段 4 泛化）

    /** 支持摄像头切换的 Fake 引擎。 */
    private class FakeVideoEngine(
        var switchFailure: String? = null,
        var facing: String = "back",
    ) : RecordingEngine {
        private var target: Path? = null

        override fun outputFileNames(): List<String> = listOf("media.m4a")

        override fun start(outputFiles: Map<String, Path>): EngineResult {
            val targetFile = outputFiles.values.first()
            target = targetFile
            return EngineResult.Ok
        }

        override fun stop(): EngineResult = EngineResult.Ok
        override fun abort() {}
        override fun switchCamera(): EngineResult {
            switchFailure?.let { return EngineResult.Failure(it) }
            facing = if (facing == "back") "front" else "back"
            return EngineResult.Ok
        }

        override fun currentCameraFacing(): String = facing

        fun writeBytes(bytes: ByteArray = "fake-video-payload".toByteArray()) {
            target?.let { Files.write(it, bytes, StandardOpenOption.APPEND) }
        }
    }

    @Test
    fun videoSession_switchCamera_recordsEventWithFacing() {
        val engine = FakeVideoEngine()
        val c = RecordingController.forVideo(
            store, engine,
            VideoRecordingConfig(targetQuality = "FHD", audioEnabled = true),
        )
        val sessionId = c.start().sessionId

        val result = c.switchCamera()
        assertTrue(result is RecordingController.Result.CameraSwitched)
        val switched = result as RecordingController.Result.CameraSwitched
        assertEquals("front", switched.facing)

        val event = store.readEvents(sessionId).events
            .single { it.type == EventTypes.CAMERA_SWITCHED }
        assertEquals("\"front\"", event.payload["facing"]?.toString())
    }

    @Test
    fun videoSession_switchCameraFailure_recordedStateUnchanged() {
        val engine = FakeVideoEngine(switchFailure = "camera busy")
        val c = RecordingController.forVideo(
            store, engine,
            VideoRecordingConfig(targetQuality = "FHD", audioEnabled = true),
        )
        val sessionId = c.start().sessionId

        val result = c.switchCamera()
        assertTrue(result is RecordingController.Result.ActionFailed)
        assertEquals(SessionState.RECORDING, store.loadSession(sessionId).state)
        val failed = store.readEvents(sessionId).events
            .single { it.type == EventTypes.ENGINE_ACTION_FAILED }
        assertEquals("\"switch_camera\"", failed.payload["action"]?.toString())
    }

    @Test
    fun videoSession_configEvent_marksKindCameraVideo() {
        val engine = FakeVideoEngine()
        val c = RecordingController.forVideo(
            store, engine,
            VideoRecordingConfig(targetQuality = "HD", audioEnabled = false),
        )
        val sessionId = c.start().sessionId
        val configEvent = store.readEvents(sessionId).events
            .single { it.type == EventTypes.RECORDING_CONFIG }
        assertEquals("\"camera_video\"", configEvent.payload["kind"]?.toString())
        assertEquals("false", configEvent.payload["audioEnabled"]?.toString())

        val session = store.loadSession(sessionId)
        assertEquals(re.tracekeep.core.model.RecordingType.CAMERA_VIDEO, session.recordingType)
    }

    @Test
    fun videoSession_happyPath_finalizesWithCorrectHash() {
        val engine = FakeVideoEngine()
        val c = RecordingController.forVideo(
            store, engine,
            VideoRecordingConfig(targetQuality = "FHD", audioEnabled = true),
        )
        val sessionId = c.start().sessionId
        engine.writeBytes()
        val stop = c.stop()
        assertTrue(stop is RecordingController.Result.Saved)

        val record = store.listFiles(sessionId).single()
        assertEquals(FileLifecycle.FINALIZED, record.lifecycle)
        assertEquals(VerificationStatus.PASS, store.verifyFile(sessionId, record.fileId))
        assertEquals(FileRole.ORIGINAL, record.role)
        assertEquals(re.tracekeep.core.model.SaveStatus.SAVED, store.loadSession(sessionId).saveStatus)
    }

    @Test
    fun audioSession_switchCamera_unsupportedByEngine_recordedAsFailure() {
        // 录音 Fake 引擎未覆写 switchCamera → 默认 Failure("camera switch not supported")
        val c = controller(FakeEngine())
        val sessionId = c.start().sessionId
        val result = c.switchCamera()
        assertTrue(result is RecordingController.Result.ActionFailed)
        assertEquals(SessionState.RECORDING, store.loadSession(sessionId).state)
    }
}
