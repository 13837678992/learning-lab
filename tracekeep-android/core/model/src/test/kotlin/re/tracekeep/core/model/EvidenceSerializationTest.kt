package re.tracekeep.core.model

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** 序列化稳定性测试：字节级可复现是证据格式（规范编码）的基础要求。 */
class EvidenceSerializationTest {

    private val json = EvidenceJson.instance

    private val sampleSession = EvidenceSession(
        sessionId = "11111111-2222-3333-4444-555555555555",
        recordingType = RecordingType.AUDIO,
        state = SessionState.CREATED,
        createdAtWallMs = 1_700_000_000_000,
        createdAtMonoMs = 123_456,
        deviceSummary = mapOf("model" to "test-device", "sdk" to "26"),
    )

    @Test
    fun session_roundTrips() {
        val text = json.encodeToString(sampleSession)
        assertEquals(sampleSession, json.decodeFromString<EvidenceSession>(text))
    }

    @Test
    fun encodeDefaults_writesFormatVersionAndNullsExplicitly() {
        val text = json.encodeToString(sampleSession)
        // 格式版本随 EvidenceFormat.VERSION 演进（v2：本地保存字段）
        assertTrue(text, text.contains("\"formatVersion\":${EvidenceFormat.VERSION}"))
        assertTrue(text, text.contains("\"sealedAtWallMs\":null"))
        assertTrue(text, text.contains("\"sealedWithAnomalies\":null"))
        // v2 本地保存字段显式写出 null（未发生保存流程）
        assertTrue(text, text.contains("\"saveStatus\":null"))
        assertTrue(text, text.contains("\"savedAtWallMs\":null"))
        assertTrue(text, text.contains("\"stoppedAtWallMs\":null"))
    }

    @Test
    fun v1Session_readsAsV2_withNullSaveFields() {
        // 向后兼容：v1 格式（无保存字段）必须可被 v2 读取，保存字段为 null
        val v1 = """{"formatVersion":1,"sessionId":"s","recordingType":"AUDIO","state":"STOPPED",""" +
            """"createdAtWallMs":1,"createdAtMonoMs":2}"""
        val decoded = json.decodeFromString<EvidenceSession>(v1)
        assertEquals(SessionState.STOPPED, decoded.state)
        assertEquals(null, decoded.saveStatus)
        assertEquals(null, decoded.savedAtWallMs)
    }

    @Test
    fun encoding_isDeterministicForSameValue() {
        val first = json.encodeToString(sampleSession)
        val second = json.encodeToString(sampleSession)
        assertEquals(first, second)
    }

    @Test
    fun event_roundTrips_withPayload() {
        val event = EvidenceEvent(
            seq = 7,
            sessionId = sampleSession.sessionId,
            wallMs = 1_700_000_000_001,
            monoMs = 123_500,
            type = EventTypes.FILE_REGISTERED,
            source = EventSource.USER_ACTION,
            payload = JsonObject(
                mapOf(
                    "fileId" to JsonPrimitive("abc"),
                    "relativePath" to JsonPrimitive("media/rec.m4a"),
                ),
            ),
        )
        val text = json.encodeToString(event)
        assertEquals(event, json.decodeFromString<EvidenceEvent>(text))
    }

    @Test
    fun decode_ignoresUnknownKeys_forwardCompatible() {
        val text = """{"formatVersion":1,"sessionId":"s","recordingType":"SCREEN","state":"CREATED",""" +
            """"createdAtWallMs":1,"createdAtMonoMs":2,"futureField":"ignored"}"""
        val decoded = json.decodeFromString<EvidenceSession>(text)
        assertEquals(SessionState.CREATED, decoded.state)
    }

    @Test
    fun enums_areEncodedByName_stableAcrossReordering() {
        val text = json.encodeToString(sampleSession)
        assertTrue(text, text.contains("\"recordingType\":\"AUDIO\""))
        assertTrue(text, text.contains("\"state\":\"CREATED\""))
        val event = EvidenceEvent(
            seq = 1, sessionId = "s", wallMs = 1, monoMs = 2,
            type = "t", source = EventSource.SYSTEM_CALLBACK,
        )
        val eventText = json.encodeToString(event)
        assertTrue(eventText, eventText.contains("\"source\":\"SYSTEM_CALLBACK\""))
    }

    @Test
    fun location_roundTrips() {
        val loc = EvidenceLocation(
            seq = 1, sessionId = "s", wallMs = 10, monoMs = 20,
            latitude = 31.2304, longitude = 121.4737, accuracyMeters = 8.5f, provider = "gps",
        )
        assertEquals(loc, json.decodeFromString<EvidenceLocation>(json.encodeToString(loc)))
    }

    @Test
    fun evidenceFile_roundTrips() {
        val file = EvidenceFile(
            fileId = "f1", sessionId = "s", relativePath = "media/a.m4a",
            role = FileRole.ORIGINAL, lifecycle = FileLifecycle.FINALIZED,
            createdWallMs = 1, sizeBytes = 1024, sha256 = "ab".repeat(32), finalizedWallMs = 2,
        )
        assertEquals(file, json.decodeFromString<EvidenceFile>(json.encodeToString(file)))
    }
}
