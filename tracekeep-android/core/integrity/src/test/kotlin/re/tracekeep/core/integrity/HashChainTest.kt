package re.tracekeep.core.integrity

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import re.tracekeep.core.model.EventSource
import re.tracekeep.core.model.EvidenceEvent

/**
 * 哈希链与规范编码测试（需求 §5；阶段 7 验收：破坏性测试逐项准确分项）。
 * 全部为合成事件，不涉及真实证据。
 */
class HashChainTest {

    private fun event(
        seq: Long,
        type: String = "t$seq",
        payload: JsonObject = JsonObject(mapOf("k" to JsonPrimitive("v$seq"))),
        prevHash: String? = null,
    ) = EvidenceEvent(
        seq = seq,
        sessionId = "s-1",
        wallMs = 1_000_000 + seq * 1000,
        monoMs = 500 + seq * 1000,
        type = type,
        source = EventSource.APP_OBSERVATION,
        payload = payload,
        prevHash = prevHash,
    )

    /** 构建一条正确入链的事件序列。 */
    private fun chained(vararg types: String): List<EvidenceEvent> {
        val out = mutableListOf<EvidenceEvent>()
        var prev: String? = null
        types.forEachIndexed { i, t ->
            val e = HashChain.withHash(event(i + 1L, type = t, prevHash = prev ?: HashChain.GENESIS_PREV_HASH))
            out += e
            prev = e.hash
        }
        return out
    }

    // ------------------------------------------------------------ 规范编码确定性

    @Test
    fun canonicalEncoding_deterministic_andPayloadKeyOrderIndependent() {
        val a = event(1, payload = JsonObject(mapOf("b" to JsonPrimitive("2"), "a" to JsonPrimitive("1"))))
        val b = event(1, payload = JsonObject(mapOf("a" to JsonPrimitive("1"), "b" to JsonPrimitive("2"))))
        // 同一逻辑内容、不同 insert 顺序 → 相同规范字节 → 相同哈希
        assertTrue(
            CanonicalEncoding.encodeEvent(a).contentEquals(CanonicalEncoding.encodeEvent(b)),
        )
        assertEquals(HashChain.computeEventHash(a), HashChain.computeEventHash(b))
    }

    @Test
    fun canonicalEncoding_excludesOwnHashField() {
        val base = event(1)
        val withHash = base.copy(hash = "deadbeef")
        // hash 字段不参与自身哈希输入 → 填入 hash 前后计算值相同
        assertEquals(HashChain.computeEventHash(base), HashChain.computeEventHash(withHash))
    }

    @Test
    fun canonicalEncoding_distinguishesNullFromEmptyString() {
        val nullPrev = event(1, prevHash = null)
        val emptyPrev = event(1, prevHash = "")
        assertNotEquals(HashChain.computeEventHash(nullPrev), HashChain.computeEventHash(emptyPrev))
    }

    // ------------------------------------------------------------ 正常链

    @Test
    fun wellFormedChain_verifiesIntact() {
        val chain = chained("a", "b", "c", "d")
        val result = HashChain.verify(chain)
        assertTrue(result.intact)
        assertEquals(4, result.chainedCount)
        assertEquals(0, result.preChainCount)
        assertEquals(-1, result.firstAnomalyIndex)
        assertTrue(result.results.all { it.status == HashChain.LinkStatus.OK })
    }

    @Test
    fun emptyChain_isIntact() {
        val result = HashChain.verify(emptyList())
        assertTrue(result.intact)
        assertEquals(0, result.chainedCount)
    }

    // ------------------------------------------------------------ 破坏性（逐项分项）

    @Test
    fun modifiedContent_reportsHashMismatch() {
        val chain = chained("a", "b", "c").toMutableList()
        // 篡改第 2 条事件的 payload（hash 字段保留旧值 → 内容与 hash 不符）
        chain[1] = chain[1].copy(payload = JsonObject(mapOf("k" to JsonPrimitive("TAMPERED"))))
        val result = HashChain.verify(chain)
        assertFalse(result.intact)
        assertEquals(HashChain.LinkStatus.HASH_MISMATCH, result.results[1].status)
        assertEquals(1, result.firstAnomalyIndex)
    }

    @Test
    fun deletedMiddleEvent_reportsBrokenLinkAndSeqGap() {
        val chain = chained("a", "b", "c", "d").toMutableList()
        chain.removeAt(1) // 删除 "b"
        val result = HashChain.verify(chain)
        assertFalse(result.intact)
        // 第 3 条（原 seq=3）现在紧跟创世，prevHash 指向被删的 b.hash → 断链
        assertTrue(
            result.results.any { it.status == HashChain.LinkStatus.BROKEN_LINK },
        )
        // 序号缺口：seq 变为 1,3,4
        assertTrue(result.results.any { it.status == HashChain.LinkStatus.SEQ_GAP })
    }

    @Test
    fun insertedForgedEvent_reportsBrokenLink() {
        val chain = chained("a", "b").toMutableList()
        // 伪造一条事件插到中间（prevHash 指向 a.hash，但 b 的 prevHash 仍指向 a.hash）
        val forged = HashChain.withHash(event(99, type = "forged", prevHash = chain[0].hash))
        chain.add(1, forged)
        val result = HashChain.verify(chain)
        assertFalse(result.intact)
        assertTrue(
            result.results.any {
                it.status == HashChain.LinkStatus.BROKEN_LINK || it.status == HashChain.LinkStatus.SEQ_OUT_OF_ORDER
            },
        )
    }

    @Test
    fun reorderedEvents_reported() {
        val chain = chained("a", "b", "c").toMutableList()
        val tmp = chain[1]; chain[1] = chain[2]; chain[2] = tmp // 交换 2/3
        val result = HashChain.verify(chain)
        assertFalse(result.intact)
        assertTrue(
            result.results.any {
                it.status == HashChain.LinkStatus.SEQ_OUT_OF_ORDER || it.status == HashChain.LinkStatus.BROKEN_LINK
            },
        )
    }

    @Test
    fun badGenesis_reported() {
        val chain = chained("a", "b")
        val brokenGenesis = listOf(
            HashChain.withHash(event(1, type = "a", prevHash = "NOT_GENESIS")),
            chain[1],
        )
        val result = HashChain.verify(brokenGenesis)
        assertFalse(result.intact)
        assertEquals(HashChain.LinkStatus.BAD_GENESIS, result.results[0].status)
    }

    @Test
    fun incompleteChainFields_reported() {
        val chain = chained("a", "b").toMutableList()
        chain[1] = chain[1].copy(hash = null) // hash 有 prevHash 无 hash
        val result = HashChain.verify(chain)
        assertFalse(result.intact)
        assertEquals(HashChain.LinkStatus.INCOMPLETE, result.results[1].status)
    }

    // ------------------------------------------------------------ 兼容（阶段 7 前历史）

    @Test
    fun legacyPreChainEvents_markedPreChain_notCountedAsIntactChain() {
        // 阶段 7 前的事件：hash/prevHash 均为 null
        val legacy = listOf(event(1, type = "legacy1"), event(2, type = "legacy2"))
        val result = HashChain.verify(legacy)
        assertEquals(2, result.preChainCount)
        assertEquals(0, result.chainedCount)
        assertTrue(result.results.all { it.status == HashChain.LinkStatus.PRE_CHAIN })
        // 纯历史事件视为"无异常"（intact=true），但 preChainCount>0 供报告如实披露
        assertTrue(result.intact)
        assertEquals(2, result.preChainCount)
    }
}
