package re.tracekeep.core.storage

import java.nio.file.Files
import java.nio.file.Path
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
import re.tracekeep.core.model.IllegalSessionTransitionException
import re.tracekeep.core.model.RecordingType
import re.tracekeep.core.model.SessionState
import re.tracekeep.core.model.VerificationStatus

class EvidenceStoreTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var root: Path
    private lateinit var store: EvidenceStore

    @Before
    fun setUp() {
        root = tempFolder.newFolder("evidence-root").toPath()
        store = EvidenceStore(root)
    }

    private fun newRecordingSession(): String {
        val session = store.createSession(RecordingType.AUDIO)
        store.transition(session.sessionId, SessionState.RECORDING)
        return session.sessionId
    }

    private fun registerFinalizedFile(sessionId: String, content: String = "hello-evidence"): String {
        val file = store.registerFile(sessionId, FileRole.ORIGINAL, "rec.m4a")
        Files.write(file.absolutePath, content.toByteArray())
        return store.finalizeFile(sessionId, file.fileId).fileId
    }

    // ------------------------------------------------------------ 会话生命周期

    @Test
    fun createSession_startsInCreated_withSessionCreatedEvent() {
        val session = store.createSession(RecordingType.SCREEN)
        assertEquals(SessionState.CREATED, session.state)
        assertEquals(re.tracekeep.core.model.EvidenceFormat.VERSION, session.formatVersion)

        val events = store.readEvents(session.sessionId)
        assertEquals(0, events.skippedLines)
        assertEquals(1, events.events.size)
        assertEquals(EventTypes.SESSION_CREATED, events.events[0].type)
        assertEquals(EventSource.USER_ACTION, events.events[0].source)
        assertEquals(1L, events.events[0].seq)
    }

    @Test
    fun fullLifecycle_transitionsAndEventsInOrder() {
        val sessionId = newRecordingSession()
        store.transition(sessionId, SessionState.PAUSED)
        store.transition(sessionId, SessionState.RECORDING)
        store.transition(sessionId, SessionState.STOPPED)

        val types = store.readEvents(sessionId).events.map { it.type }
        assertEquals(
            listOf(
                EventTypes.SESSION_CREATED,
                EventTypes.SESSION_STARTED,
                EventTypes.SESSION_PAUSED,
                EventTypes.SESSION_RESUMED,
                EventTypes.SESSION_STOPPED,
            ),
            types,
        )
        assertEquals(SessionState.STOPPED, store.loadSession(sessionId).state)
    }

    @Test(expected = IllegalSessionTransitionException::class)
    fun illegalTransition_createdToPaused_rejected() {
        val session = store.createSession(RecordingType.AUDIO)
        store.transition(session.sessionId, SessionState.PAUSED)
    }

    @Test(expected = StorageException::class)
    fun plainTransitionToSealed_rejected() {
        val sessionId = newRecordingSession()
        store.transition(sessionId, SessionState.STOPPED)
        store.transition(sessionId, SessionState.SEALED)
    }

    @Test(expected = IllegalSessionTransitionException::class)
    fun transitionAfterAborted_rejected() {
        val sessionId = newRecordingSession()
        store.transition(sessionId, SessionState.ABORTED)
        store.transition(sessionId, SessionState.RECORDING)
    }

    @Test
    fun listSessionIds_returnsCreatedSessions() {
        val a = store.createSession(RecordingType.AUDIO).sessionId
        val b = store.createSession(RecordingType.SCREEN).sessionId
        assertEquals(listOf(a, b).sorted(), store.listSessionIds())
    }

    // ------------------------------------------------------------ 文件登记与封装

    @Test
    fun registerFile_setsRegisteredLifecycle_andCreatesEmptyFile() {
        val sessionId = newRecordingSession()
        val file = store.registerFile(sessionId, FileRole.ORIGINAL, "a.m4a")
        assertTrue(file.absolutePath.toString().contains("/media/"))
        assertEquals(0L, Files.size(file.absolutePath))
        val record = store.listFiles(sessionId).single()
        assertEquals(FileLifecycle.REGISTERED, record.lifecycle)
        assertNull(record.sha256)
    }

    @Test
    fun finalizeFile_recordsSha256AndSize() {
        val sessionId = newRecordingSession()
        val fileId = registerFinalizedFile(sessionId, "stage2-content")
        val record = store.listFiles(sessionId).single()
        assertEquals(FileLifecycle.FINALIZED, record.lifecycle)
        assertEquals("stage2-content".length.toLong(), record.sizeBytes)
        assertEquals(64, record.sha256!!.length)
        assertEquals(fileId, record.fileId)
    }

    @Test
    fun finalizeFile_isIdempotent() {
        val sessionId = newRecordingSession()
        val fileId = registerFinalizedFile(sessionId)
        val first = store.listFiles(sessionId).single()
        store.finalizeFile(sessionId, fileId)
        val second = store.listFiles(sessionId).single()
        assertEquals(first, second)
    }

    @Test
    fun derivedFile_requiresAndRecordsSource() {
        val sessionId = newRecordingSession()
        val originalId = registerFinalizedFile(sessionId)
        val derived = store.registerFile(sessionId, FileRole.DERIVED, "preview.jpg", derivedFromFileId = originalId)
        Files.write(derived.absolutePath, "thumb".toByteArray())
        store.finalizeFile(sessionId, derived.fileId)
        val registry = store.listFiles(sessionId)
        assertEquals(2, registry.size)
        val derivedRecord = registry.single { it.role == FileRole.DERIVED }
        assertEquals(originalId, derivedRecord.derivedFromFileId)
        assertTrue(derived.absolutePath.toString().contains("/derived/"))
    }

    @Test(expected = IllegalArgumentException::class)
    fun derivedFile_withoutSource_rejected() {
        val sessionId = newRecordingSession()
        store.registerFile(sessionId, FileRole.DERIVED, "preview.jpg")
    }

    @Test(expected = IllegalArgumentException::class)
    fun originalFile_withSource_rejected() {
        val sessionId = newRecordingSession()
        val originalId = registerFinalizedFile(sessionId)
        store.registerFile(sessionId, FileRole.ORIGINAL, "b.m4a", derivedFromFileId = originalId)
    }

    @Test
    fun markFileIncomplete_clearsHash_andNotesReason() {
        val sessionId = newRecordingSession()
        val file = store.registerFile(sessionId, FileRole.ORIGINAL, "broken.m4a")
        val incomplete = store.markFileIncomplete(sessionId, file.fileId, "封装失败：磁盘不足")
        assertEquals(FileLifecycle.INCOMPLETE, incomplete.lifecycle)
        assertNull(incomplete.sha256)
        assertEquals("封装失败：磁盘不足", incomplete.note)
    }

    // ------------------------------------------------------------ 校验状态

    @Test
    fun verifyFile_passWhenUnchanged() {
        val sessionId = newRecordingSession()
        val fileId = registerFinalizedFile(sessionId)
        assertEquals(VerificationStatus.PASS, store.verifyFile(sessionId, fileId))
    }

    @Test
    fun verifyFile_failWhenOneByteChanged() {
        val sessionId = newRecordingSession()
        val file = store.registerFile(sessionId, FileRole.ORIGINAL, "tamper.m4a")
        Files.write(file.absolutePath, "original-content".toByteArray())
        store.finalizeFile(sessionId, file.fileId)

        // 篡改一个字节（同长度替换，排除大小差异的偶然发现）
        val bytes = Files.readAllBytes(file.absolutePath)
        bytes[0] = (bytes[0] + 1).toByte()
        Files.write(file.absolutePath, bytes)

        assertEquals(VerificationStatus.FAIL, store.verifyFile(sessionId, file.fileId))
    }

    @Test
    fun verifyFile_missingWhenDeleted() {
        val sessionId = newRecordingSession()
        val file = store.registerFile(sessionId, FileRole.ORIGINAL, "gone.m4a")
        Files.write(file.absolutePath, "x".toByteArray())
        store.finalizeFile(sessionId, file.fileId)
        Files.delete(file.absolutePath)
        assertEquals(VerificationStatus.MISSING, store.verifyFile(sessionId, file.fileId))
    }

    @Test
    fun verifyFile_unfinishedWhenNeverFinalized() {
        val sessionId = newRecordingSession()
        val file = store.registerFile(sessionId, FileRole.ORIGINAL, "pending.m4a")
        assertEquals(VerificationStatus.UNFINISHED, store.verifyFile(sessionId, file.fileId))
    }

    // ------------------------------------------------------------ 封存

    @Test(expected = StorageException::class)
    fun seal_requiresStoppedOrAborted() {
        val sessionId = newRecordingSession()
        store.seal(sessionId)
    }

    @Test
    fun seal_fromStopped_marksSealed_andWritesSealRecord() {
        val sessionId = newRecordingSession()
        val fileId = registerFinalizedFile(sessionId)
        store.transition(sessionId, SessionState.STOPPED)

        val result = store.seal(sessionId)
        assertFalse(result.record.sealedWithAnomalies)
        assertEquals(SessionState.STOPPED, result.record.sealedFromState)
        assertEquals(1, result.record.files.size)
        assertEquals(VerificationStatus.PASS, result.record.files.single().verification)

        val session = store.loadSession(sessionId)
        assertEquals(SessionState.SEALED, session.state)
        assertNotNull(session.sealedAtWallMs)
        assertEquals(false, session.sealedWithAnomalies)

        // 封存事件已追加，其摘要覆盖含封存事件的完整日志
        val events = store.readEvents(sessionId)
        assertTrue(events.events.any { it.type == EventTypes.SESSION_SEALED })
        assertEquals(fileId, store.listFiles(sessionId).single().fileId)
    }

    @Test
    fun seal_marksStillRegisteredFilesIncomplete_andFlagsAnomalies() {
        val sessionId = newRecordingSession()
        val doneId = registerFinalizedFile(sessionId, "done")
        val pending = store.registerFile(sessionId, FileRole.ORIGINAL, "pending.m4a")
        store.transition(sessionId, SessionState.STOPPED)

        val result = store.seal(sessionId)
        assertTrue(result.record.sealedWithAnomalies)
        val pendingEntry = result.record.files.single { it.fileId == pending.fileId }
        assertEquals(FileLifecycle.INCOMPLETE, pendingEntry.lifecycle)
        assertEquals(VerificationStatus.UNFINISHED, pendingEntry.verification)
        val doneEntry = result.record.files.single { it.fileId == doneId }
        assertEquals(VerificationStatus.PASS, doneEntry.verification)
    }

    @Test
    fun seal_fromAborted_recordsAnomaliesFlag() {
        val sessionId = newRecordingSession()
        store.transition(sessionId, SessionState.ABORTED)
        val result = store.seal(sessionId)
        assertEquals(SessionState.ABORTED, result.record.sealedFromState)
        assertEquals(true, store.loadSession(sessionId).sealedWithAnomalies)
    }

    @Test(expected = SessionSealedException::class)
    fun sealedSession_rejectsFurtherEvents() {
        val sessionId = newRecordingSession()
        store.transition(sessionId, SessionState.STOPPED)
        store.seal(sessionId)
        store.appendEvent(sessionId, "late_event", EventSource.APP_OBSERVATION)
    }

    @Test(expected = SessionSealedException::class)
    fun sealedSession_rejectsFileRegistration() {
        val sessionId = newRecordingSession()
        store.transition(sessionId, SessionState.STOPPED)
        store.seal(sessionId)
        store.registerFile(sessionId, FileRole.ORIGINAL, "late.m4a")
    }

    @Test(expected = SessionSealedException::class)
    fun sealedSession_rejectsTransition() {
        val sessionId = newRecordingSession()
        store.transition(sessionId, SessionState.STOPPED)
        store.seal(sessionId)
        store.transition(sessionId, SessionState.ABORTED)
    }

    // ------------------------------------------------------------ 封存后复核

    @Test
    fun verifySeal_allMatchWhenUntouched() {
        val sessionId = newRecordingSession()
        registerFinalizedFile(sessionId)
        store.appendLocation(sessionId, 31.2304, 121.4737, accuracyMeters = 5f, provider = "gps")
        store.transition(sessionId, SessionState.STOPPED)
        store.seal(sessionId)

        val verification = store.verifySeal(sessionId)
        assertTrue(verification.allMatch)
        assertTrue(verification.eventsMatch)
        assertTrue(verification.locationsMatch)
        assertTrue(verification.files.single().matchesSeal)
        assertEquals(VerificationStatus.PASS, verification.files.single().currentVerification)
    }

    @Test
    fun verifySeal_detectsTamperedMedia() {
        val sessionId = newRecordingSession()
        val file = store.registerFile(sessionId, FileRole.ORIGINAL, "media.m4a")
        Files.write(file.absolutePath, "before-seal".toByteArray())
        store.finalizeFile(sessionId, file.fileId)
        store.transition(sessionId, SessionState.STOPPED)
        store.seal(sessionId)

        // 封存后篡改（模拟离线被改）
        Files.write(file.absolutePath, "after-seal!".toByteArray())

        val verification = store.verifySeal(sessionId)
        assertFalse(verification.allMatch)
        val match = verification.files.single()
        assertFalse(match.matchesSeal)
        assertEquals(VerificationStatus.FAIL, match.currentVerification)
    }

    @Test
    fun verifySeal_detectsAppendedEventLine() {
        val sessionId = newRecordingSession()
        store.transition(sessionId, SessionState.STOPPED)
        store.seal(sessionId)

        // 封存后直接向 events.log 追加一行（绕过 API，模拟外部篡改）
        val eventsFile = root.resolve("sessions/$sessionId/events.log")
        val extra =
            """{"formatVersion":1,"seq":99,"sessionId":"$sessionId","wallMs":1,"monoMs":2,"type":"forged","source":"APP_OBSERVATION","payload":{}}"""
        Files.write(
            eventsFile,
            (System.lineSeparator() + extra).toByteArray(),
            java.nio.file.StandardOpenOption.APPEND,
        )

        val verification = store.verifySeal(sessionId)
        assertFalse(verification.eventsMatch)
        assertFalse(verification.allMatch)
    }

    @Test
    fun verifySeal_detectsMissingFile() {
        val sessionId = newRecordingSession()
        val file = store.registerFile(sessionId, FileRole.ORIGINAL, "del.m4a")
        Files.write(file.absolutePath, "content".toByteArray())
        store.finalizeFile(sessionId, file.fileId)
        store.transition(sessionId, SessionState.STOPPED)
        store.seal(sessionId)

        Files.delete(file.absolutePath)

        val verification = store.verifySeal(sessionId)
        assertFalse(verification.allMatch)
        assertEquals(VerificationStatus.MISSING, verification.files.single().currentVerification)
    }

    @Test(expected = StorageException::class)
    fun verifySeal_unsealedSessionRejected() {
        val sessionId = newRecordingSession()
        store.verifySeal(sessionId)
    }

    // ------------------------------------------------------------ 崩溃恢复

    @Test
    fun recovery_abortsRecordingSession_andMarksFilesIncomplete() {
        val sessionId = newRecordingSession()
        val file = store.registerFile(sessionId, FileRole.ORIGINAL, "in-flight.m4a")
        Files.write(file.absolutePath, "partial-data".toByteArray())

        // 模拟进程被杀后重启：新建 store 实例执行恢复扫描
        val freshStore = EvidenceStore(root)
        val recovered = freshStore.recoverOnStartup()

        assertEquals(1, recovered.size)
        assertEquals(sessionId, recovered.single().sessionId)
        assertEquals(SessionState.RECORDING, recovered.single().observedState)
        assertEquals(listOf(file.fileId), recovered.single().markedIncompleteFileIds)

        val session = freshStore.loadSession(sessionId)
        assertEquals(SessionState.ABORTED, session.state)
        val record = freshStore.listFiles(sessionId).single()
        assertEquals(FileLifecycle.INCOMPLETE, record.lifecycle)
        assertNull(record.sha256)
    }

    @Test
    fun recovery_leavesStoppedAndSealedSessionsUntouched() {
        val stoppedId = newRecordingSession()
        store.transition(stoppedId, SessionState.STOPPED)

        val sealedId = newRecordingSession()
        store.transition(sealedId, SessionState.STOPPED)
        store.seal(sealedId)

        val freshStore = EvidenceStore(root)
        val recovered = freshStore.recoverOnStartup()
        assertTrue(recovered.isEmpty())
        assertEquals(SessionState.STOPPED, freshStore.loadSession(stoppedId).state)
        assertEquals(SessionState.SEALED, freshStore.loadSession(sealedId).state)
    }

    @Test
    fun recovery_recordsObservationsInEventLog() {
        val sessionId = newRecordingSession()
        EvidenceStore(root).recoverOnStartup()
        val events = store.readEvents(sessionId).events
        val recovery = events.single { it.type == EventTypes.RECOVERY_OBSERVED }
        assertEquals(EventSource.APP_OBSERVATION, recovery.source)
        assertEquals("RECORDING", recovery.payload["observedState"]?.toString()?.trim('"'))
        assertTrue(events.any { it.type == EventTypes.SESSION_ABORTED })
    }

    // ------------------------------------------------------------ 追加式日志

    @Test
    fun eventSeq_isMonotonicAcrossStoreInstances() {
        val sessionId = newRecordingSession()
        store.appendEvent(sessionId, "custom_a", EventSource.APP_OBSERVATION)

        val freshStore = EvidenceStore(root)
        freshStore.appendEvent(sessionId, "custom_b", EventSource.APP_OBSERVATION)

        val seqs = store.readEvents(sessionId).events.map { it.seq }
        assertEquals(seqs.sorted(), seqs)
        assertEquals(seqs.distinct(), seqs)
    }

    @Test
    fun readEvents_skipsCorruptLines_withoutModifyingFile() {
        val sessionId = newRecordingSession()
        store.appendEvent(sessionId, "custom_a", EventSource.APP_OBSERVATION)
        val eventsFile = root.resolve("sessions/$sessionId/events.log")
        val corrupted = Files.readAllBytes(eventsFile) +
            "\n{not-valid-json}\n".toByteArray()
        Files.write(eventsFile, corrupted)

        val result = store.readEvents(sessionId)
        // session_created + session_started + custom_a = 3 条可解析事件
        assertEquals(3, result.events.size)
        assertEquals(1L, result.skippedLines)
        // 原文件保持被篡改后的字节状态（不修复、不覆盖）
        assertTrue(String(Files.readAllBytes(eventsFile)).contains("{not-valid-json}"))
    }

    @Test
    fun locations_appendAndRead() {
        val sessionId = newRecordingSession()
        store.appendLocation(sessionId, 39.9042, 116.4074, accuracyMeters = 12.5f, provider = "gps")
        store.appendLocation(sessionId, 39.9043, 116.4075, accuracyMeters = 30f, provider = "fused")
        val result = store.readLocations(sessionId)
        assertEquals(0, result.skippedLines)
        assertEquals(listOf(1L, 2L), result.locations.map { it.seq })
        assertEquals(39.9042, result.locations[0].latitude, 1e-9)
    }

    @Test
    fun locations_absentFile_readsEmpty() {
        val sessionId = newRecordingSession()
        val result = store.readLocations(sessionId)
        assertTrue(result.locations.isEmpty())
        assertEquals(0, result.skippedLines)
    }
}
