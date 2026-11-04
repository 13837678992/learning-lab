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
import re.tracekeep.core.model.EventTypes
import re.tracekeep.core.model.FileLifecycle
import re.tracekeep.core.model.SaveStatus
import re.tracekeep.core.model.SessionState
import re.tracekeep.core.storage.EvidenceStore
import re.tracekeep.core.storage.SaveOutcome

/**
 * "停止后直接保存到本地证据库"专项测试（需求：停止并封装完成 ≠ 保存完成）。
 * 覆盖：保存成功持久化、幂等、失败保留文件、启动恢复重试、0 字节拒绝保存。
 * 所有"录制数据"均为测试临时目录中的合成字节，不构成正式证据。
 */
class SaveOnStopTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var store: EvidenceStore
    private lateinit var root: Path

    private class FakeEngine : RecordingEngine {
        private var target: Path? = null
        override fun outputFileNames(): List<String> = listOf("media.m4a")

        override fun start(outputFiles: Map<String, Path>): EngineResult {
            val targetFile = outputFiles.values.first()
            target = targetFile
            return EngineResult.Ok
        }

        override fun stop(): EngineResult = EngineResult.Ok
        override fun abort() {}
        fun writeBytes(bytes: ByteArray = "fake-recording-bytes".toByteArray()) {
            target?.let { Files.write(it, bytes, StandardOpenOption.APPEND) }
        }
    }

    @Before
    fun setUp() {
        root = tempFolder.newFolder("evidence-root").toPath()
        store = EvidenceStore(root)
    }

    private fun makeStoppedSessionWithFile(): Triple<RecordingController, String, String> {
        val engine = FakeEngine()
        val c = RecordingController.forAudio(
            store, engine,
            AudioRecordingConfig("AAC", "MPEG_4", 44_100, 1, 128_000),
        )
        val sessionId = c.start().sessionId
        engine.writeBytes()
        c.stop()
        val fileId = store.listFiles(sessionId).single().fileId
        return Triple(c, sessionId, fileId)
    }

    // ------------------------------------------------------------ 保存成功与持久化

    @Test
    fun stop_savesSession_withPersistedStatusAndTimes() {
        val (_, sessionId, fileId) = makeStoppedSessionWithFile()

        val session = store.loadSession(sessionId)
        assertEquals(SaveStatus.SAVED, session.saveStatus)
        assertNotNull(session.savedAtWallMs)
        assertNotNull(session.stoppedAtWallMs)
        assertNull(session.saveErrorReason)

        val record = store.listFiles(sessionId).single()
        assertEquals(FileLifecycle.FINALIZED, record.lifecycle)
        assertNotNull(record.sha256)

        // 保存事件落盘，且携带完整性材料
        val savedEvent = store.readEvents(sessionId).events
            .single { it.type == EventTypes.RECORDING_SAVED }
        assertTrue(savedEvent.payload["sha256"]?.toString()?.contains(record.sha256!!) == true)
        assertTrue(savedEvent.payload["fileId"]?.toString()?.contains(fileId) == true)
    }

    @Test
    fun restart_persistedRecordStillVisibleInLibrary() {
        val (_, sessionId, _) = makeStoppedSessionWithFile()

        // 模拟 App 重启：新 store 实例 + 启动恢复扫描
        val freshStore = EvidenceStore(root)
        freshStore.recoverOnStartup()
        val saveRecoveries = freshStore.recoverPendingSaves()

        // 已保存会话不被重复保存；记录仍在
        assertTrue(saveRecoveries.isEmpty())
        val session = freshStore.loadSession(sessionId)
        assertEquals(SaveStatus.SAVED, session.saveStatus)
        assertEquals(SessionState.STOPPED, session.state)
    }

    // ------------------------------------------------------------ 幂等

    @Test
    fun completeRecordingSave_isIdempotent_noDuplicateEvents() {
        val (_, sessionId, fileId) = makeStoppedSessionWithFile()
        val savedEventsBefore = store.readEvents(sessionId).events
            .count { it.type == EventTypes.RECORDING_SAVED }
        assertEquals(1, savedEventsBefore)

        // 重复调用（模拟快速重复点击/恢复重试）
        val second = store.completeRecordingSave(sessionId, fileId)
        assertTrue(second is SaveOutcome.Saved)
        val savedEventsAfter = store.readEvents(sessionId).events
            .count { it.type == EventTypes.RECORDING_SAVED }
        assertEquals("重复保存不得产生重复事件", 1, savedEventsAfter)
    }

    // ------------------------------------------------------------ 失败与保留

    @Test
    fun integrityFailure_marksFailed_keepsFile() {
        val (_, sessionId, fileId) = makeStoppedSessionWithFile()
        // 制造"保存前文件被改"的场景：直接篡改已封装文件后调用保存
        val record = store.listFiles(sessionId).single()
        val absolute = root.resolve("sessions/$sessionId/${record.relativePath}")
        val bytes = Files.readAllBytes(absolute)
        bytes[0] = (bytes[0] + 1).toByte()
        Files.write(absolute, bytes)

        // 手动把会话重置为"未保存"以复现保存时的校验失败路径
        // （实际场景：保存流程内文件被并发改动；测试直接调用完整保存入口）
        resetSaveStateForTest(sessionId)
        val outcome = store.completeRecordingSave(sessionId, fileId)

        assertTrue(outcome is SaveOutcome.Failed)
        val session = store.loadSession(sessionId)
        assertEquals(SaveStatus.FAILED, session.saveStatus)
        assertNotNull(session.saveErrorReason)
        // 文件必须保留（不因保存失败删除）
        assertTrue(Files.exists(absolute))
        // 失败事件落盘
        assertTrue(
            store.readEvents(sessionId).events.any { it.type == EventTypes.RECORDING_SAVE_FAILED },
        )
    }

    @Test
    fun emptyFile_rejectedAsSaveFailure() {
        // 0 字节文件不是有效保存对象（如引擎异常产生的空封装）
        val engine = object : RecordingEngine {
            private var target: Path? = null
            override fun outputFileNames(): List<String> = listOf("media.m4a")

            override fun start(outputFiles: Map<String, Path>): EngineResult {
                target = outputFiles.values.first()
                return EngineResult.Ok
            }

            override fun stop(): EngineResult = EngineResult.Ok
            override fun abort() {}
        }
        val c = RecordingController.forAudio(
            store, engine,
            AudioRecordingConfig("AAC", "MPEG_4", 44_100, 1, 128_000),
        )
        val sessionId = c.start().sessionId
        // 不写任何字节
        val result = c.stop()
        assertTrue(result is RecordingController.Result.SaveFailed)
        assertEquals(SaveStatus.FAILED, store.loadSession(sessionId).saveStatus)
    }

    @Test
    fun notFinalizedFile_rejectedAsSaveFailure() {
        val session = store.createSession(re.tracekeep.core.model.RecordingType.AUDIO)
        store.transition(session.sessionId, SessionState.RECORDING)
        val file = store.registerFile(session.sessionId, re.tracekeep.core.model.FileRole.ORIGINAL, "a.m4a")
        store.transition(session.sessionId, SessionState.STOPPED)
        // 未 finalize（生命周期 REGISTERED）→ 保存必须失败
        val outcome = store.completeRecordingSave(session.sessionId, file.fileId)
        assertTrue(outcome is SaveOutcome.Failed)
        assertEquals(SaveStatus.FAILED, store.loadSession(session.sessionId).saveStatus)
    }

    // ------------------------------------------------------------ 崩溃恢复（保存中退出）

    @Test
    fun pendingSaveRecovery_completesSaveAfterRestart() {
        // 模拟"停止成功但保存记录未写入"的崩溃现场：手工构造 STOPPED + FINALIZED 且 saveStatus=null
        val session = store.createSession(re.tracekeep.core.model.RecordingType.AUDIO)
        store.transition(session.sessionId, SessionState.RECORDING)
        val file = store.registerFile(session.sessionId, re.tracekeep.core.model.FileRole.ORIGINAL, "a.m4a")
        Files.write(file.absolutePath, "recover-me".toByteArray())
        store.finalizeFile(session.sessionId, file.fileId)
        store.transition(session.sessionId, SessionState.STOPPED)
        // 此时会话 saveStatus = null（保存流程未发生）

        val freshStore = EvidenceStore(root)
        val results = freshStore.recoverPendingSaves()

        assertEquals(1, results.size)
        assertTrue(results.single().saved)
        val recovered = freshStore.loadSession(session.sessionId)
        assertEquals(SaveStatus.SAVED, recovered.saveStatus)
        assertNotNull(recovered.savedAtWallMs)
    }

    @Test
    fun recovery_observesFactBeforeRetrying() {
        val session = store.createSession(re.tracekeep.core.model.RecordingType.AUDIO)
        store.transition(session.sessionId, SessionState.RECORDING)
        val file = store.registerFile(session.sessionId, re.tracekeep.core.model.FileRole.ORIGINAL, "a.m4a")
        Files.write(file.absolutePath, "observed".toByteArray())
        store.finalizeFile(session.sessionId, file.fileId)
        store.transition(session.sessionId, SessionState.STOPPED)

        EvidenceStore(root).recoverPendingSaves()

        val events = store.readEvents(session.sessionId).events
        val observed = events.single { it.type == EventTypes.RECOVERY_OBSERVED }
        assertEquals("STOPPED_UNSAVED", observed.payload["observedState"]?.toString()?.trim('"'))
        assertTrue(events.any { it.type == EventTypes.RECORDING_SAVED })
    }

    /** 测试辅助：将已保存会话重置为未保存状态（模拟保存流程内部校验失败场景）。 */
    private fun resetSaveStateForTest(sessionId: String) {
        // 通过反射以外的正规途径：直接重写 session.json 的保存字段
        val sessionFile = root.resolve("sessions/$sessionId/session.json")
        val text = Files.readString(sessionFile)
        val updated = text
            .replace(Regex("\"savedAtWallMs\":\\d+"), "\"savedAtWallMs\":null")
            .replace(Regex("\"saveStatus\":\"[A-Z]+\""), "\"saveStatus\":null")
        Files.writeString(sessionFile, updated)
    }
}
