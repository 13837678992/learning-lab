package re.tracekeep.core.storage

import java.nio.file.Path
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import re.tracekeep.core.model.EventSource
import re.tracekeep.core.model.EventTypes
import re.tracekeep.core.model.RecordingType
import re.tracekeep.core.model.SessionState
import re.tracekeep.core.model.TimeProvider

/**
 * 时间跳变集成测试（需求 §4 验收：「模拟时间跳变测试不会悄悄改写历史记录」；阶段 6）。
 * 使用可控 TimeProvider 注入跳变，验证：异常被如实追加记录、历史事件字节未被改写。
 */
class TimeAnomalyIntegrationTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    /**
     * 可编程时间源：读数由测试显式设置（不自动推进）——避免 wallMs()/monoMs() 多次调用
     * 之间自身产生偏移，使"是否记录异常"完全取决于注入的场景。
     */
    private class ScriptedTime : TimeProvider {
        var wall: Long = 1_000_000
        var mono: Long = 500
        override fun wallMs(): Long = wall
        override fun monoMs(): Long = mono
    }

    private lateinit var root: Path

    @Before
    fun setUp() {
        root = tempFolder.newFolder("root").toPath()
    }

    @Test
    fun wallClockJump_isRecordedAsObservedAnomaly() {
        val clock = ScriptedTime()
        val store = EvidenceStore(root, clock)
        val session = store.createSession(RecordingType.AUDIO)

        // 正常推进（偏移不变）
        clock.wall += 1_000; clock.mono += 1_000
        store.appendEvent(session.sessionId, "custom_a", EventSource.APP_OBSERVATION)

        // 模拟墙钟前跳 1 小时（单调钟仅正常推进）
        clock.wall += 3_600_000; clock.mono += 1_000
        store.appendEvent(session.sessionId, "custom_b", EventSource.APP_OBSERVATION)

        val events = store.readEvents(session.sessionId).events
        val anomaly = events.singleOrNull { it.type == EventTypes.TIME_ANOMALY_OBSERVED }
        assertTrue("应记录 TIME_ANOMALY_OBSERVED", anomaly != null)
        assertEquals("\"WALL_CLOCK_ADVANCED\"", anomaly!!.payload["kind"]?.toString())

        // 历史记录未被改写：原事件仍存在且顺序单调
        assertTrue(events.any { it.type == "custom_a" })
        assertTrue(events.any { it.type == "custom_b" })
        val seqs = events.map { it.seq }
        assertEquals(seqs.sorted(), seqs)
        assertEquals(seqs.distinct(), seqs)
    }

    @Test
    fun stableClock_noFalsePositive() {
        val clock = ScriptedTime()
        val store = EvidenceStore(root, clock)
        val session = store.createSession(RecordingType.AUDIO)
        clock.wall += 1_000; clock.mono += 1_000
        store.appendEvent(session.sessionId, "a", EventSource.APP_OBSERVATION)
        clock.wall += 1_000; clock.mono += 1_000
        store.appendEvent(session.sessionId, "b", EventSource.APP_OBSERVATION)

        val events = store.readEvents(session.sessionId).events
        assertTrue(
            "稳定时钟不应产生时间异常事件",
            events.none { it.type == EventTypes.TIME_ANOMALY_OBSERVED },
        )
    }

    @Test
    fun restart_doesNotFalsePositive_whenBaselineRestoredFromLog() {
        val clock = ScriptedTime()
        val store1 = EvidenceStore(root, clock)
        val session = store1.createSession(RecordingType.AUDIO)
        clock.wall += 1_000; clock.mono += 1_000
        store1.appendEvent(session.sessionId, "before_restart", EventSource.APP_OBSERVATION)

        // 模拟 App 重启：新 store 实例（内存基线清空），但从 events.log 末条恢复基线
        val store2 = EvidenceStore(root, clock)
        clock.wall += 1_000; clock.mono += 1_000
        store2.appendEvent(session.sessionId, "after_restart", EventSource.APP_OBSERVATION)

        val events = store2.readEvents(session.sessionId).events
        // 时间源连续推进 → 不应因"新实例"而误报时间异常
        assertTrue(
            "重启后基线应从事件日志恢复，不误报",
            events.none { it.type == EventTypes.TIME_ANOMALY_OBSERVED },
        )
        assertTrue(events.any { it.type == "after_restart" })
    }
}
