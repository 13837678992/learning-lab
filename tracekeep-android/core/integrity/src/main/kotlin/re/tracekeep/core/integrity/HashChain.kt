package re.tracekeep.core.integrity

import re.tracekeep.core.model.EvidenceEvent

/**
 * 事件哈希链（需求 §5；阶段 7）。
 *
 * 规则（稳定、可复现、可独立验证）：
 * - 每条事件的 `hash = SHA-256( 规范编码(事件, 编码版本) )`，编码见 [CanonicalEncoding]，
 *   其中**包含 `prevHash`**（前一条事件的 hash）——因此任何一条事件的内容变化都会
 *   导致其 hash 变化，并连带破坏其后所有事件的链（除攻击者重算整条后缀，见能力边界）。
 * - 第 1 条事件（创世）的 `prevHash` 固定为 [GENESIS_PREV_HASH] 常量
 *   （不是 null 就是链的开始；null 视为"该事件尚未进入链"，见 [verify] 的 PRE_CHAIN）。
 * - 序号 `seq` 必须严格从 1 开始、逐条 +1；缺口、重复、乱序分别报告。
 *
 * 能力边界（写进报告与文档时不得夸大）：
 * - 哈希链是**防篡改检测**机制，不是可信时间证明；链完好不代表内容真实；
 * - 设备被完全控制（Root/恶意软件）时，攻击者可重建整条链使验证通过——
 *   本机制的保证边界见 docs/THREAT_MODEL.md F-2/F-3。
 */
object HashChain {

    /** 链使用的哈希算法（固定；写入签名对象与报告）。 */
    const val ALGORITHM: String = "SHA-256"

    /** 创世（首条事件）的前哈希常量。 */
    const val GENESIS_PREV_HASH: String = "GENESIS"

    /** 计算单条事件的链哈希（不修改事件）。 */
    fun computeEventHash(event: EvidenceEvent, encodingVersion: Int = CanonicalEncoding.ENCODING_VERSION): String =
        Sha256.of(CanonicalEncoding.encodeEvent(event, encodingVersion))

    /** 为事件填写 `hash` 字段（返回值仍不可变；调用方自行持久化）。 */
    fun withHash(event: EvidenceEvent): EvidenceEvent =
        event.copy(hash = computeEventHash(event))

    /** 逐条事件的链校验状态（分项，不得笼统返回"验证失败"）。 */
    enum class LinkStatus {
        /** 尚未进入链（hash/prevHash 均为 null）——早于阶段 7 记录的历史事件，如实标注。 */
        PRE_CHAIN,

        /** 链完整：prevHash 与上一条 hash 相符且自身 hash 正确。 */
        OK,

        /** 创世事件 prevHash 不是 GENESIS 常量。 */
        BAD_GENESIS,

        /** prevHash 与上一条事件的 hash 不符（删除、插入或篡改导致断链）。 */
        BROKEN_LINK,

        /** 自身 hash 与其规范编码的计算结果不符（内容被篡改）。 */
        HASH_MISMATCH,

        /** 序号缺口（seq 未从 1 连续递增，疑似缺失记录）。 */
        SEQ_GAP,

        /** 序号重复或回退（疑似重排/重复插入）。 */
        SEQ_OUT_OF_ORDER,

        /** 字段缺失（如 hash 有值但 prevHash 为 null——链中不应出现）。 */
        INCOMPLETE,
    }

    data class LinkResult(
        val index: Int,
        val seq: Long,
        val status: LinkStatus,
        val detail: String = "",
    )

    data class ChainResult(
        val results: List<LinkResult>,
        /** 全部事件均为 [LinkStatus.OK]（或空链）时为 true。 */
        val intact: Boolean,
        /** 进入链的事件数（hash 非 null）。 */
        val chainedCount: Int,
        /** 未进入链的事件数（[LinkStatus.PRE_CHAIN]）。 */
        val preChainCount: Int,
        /** 首条断裂/异常的下标（-1 表示无异常）。便于定位。 */
        val firstAnomalyIndex: Int,
    )

    /**
     * 校验事件序列的链完整性。事件须按写入顺序给出（即 events.log 行序）。
     * 只读、不修复；对每一条给出准确分项状态。
     */
    fun verify(events: List<EvidenceEvent>, encodingVersion: Int = CanonicalEncoding.ENCODING_VERSION): ChainResult {
        val results = ArrayList<LinkResult>(events.size)
        var expectedSeq = 1L
        var prevHash: String? = null
        var chained = 0
        var preChain = 0
        var firstAnomaly = -1

        events.forEachIndexed { index, event ->
            // 编号连续性
            if (event.seq != expectedSeq) {
                val status = if (event.seq < expectedSeq) LinkStatus.SEQ_OUT_OF_ORDER else LinkStatus.SEQ_GAP
                results += LinkResult(index, event.seq, status, "expected seq=$expectedSeq, got ${event.seq}")
                if (firstAnomaly < 0) firstAnomaly = index
                expectedSeq = event.seq + 1
            } else {
                expectedSeq++
            }

            // 是否已进入链
            if (event.hash == null && event.prevHash == null) {
                results += LinkResult(index, event.seq, LinkStatus.PRE_CHAIN, "legacy event (no chain fields)")
                preChain++
                return@forEachIndexed
            }
            if (event.hash == null || event.prevHash == null) {
                results += LinkResult(index, event.seq, LinkStatus.INCOMPLETE, "hash/prevHash partially set")
                if (firstAnomaly < 0) firstAnomaly = index
                return@forEachIndexed
            }

            // 创世
            if (chained == 0) {
                if (event.prevHash != GENESIS_PREV_HASH) {
                    results += LinkResult(index, event.seq, LinkStatus.BAD_GENESIS, "first chained event prevHash=${event.prevHash}")
                    if (firstAnomaly < 0) firstAnomaly = index
                } else if (computeEventHash(event, encodingVersion) != event.hash) {
                    results += LinkResult(index, event.seq, LinkStatus.HASH_MISMATCH, "genesis content hash mismatch")
                    if (firstAnomaly < 0) firstAnomaly = index
                } else {
                    results += LinkResult(index, event.seq, LinkStatus.OK)
                }
            } else {
                if (event.prevHash != prevHash) {
                    results += LinkResult(index, event.seq, LinkStatus.BROKEN_LINK, "prevHash != previous hash")
                    if (firstAnomaly < 0) firstAnomaly = index
                } else if (computeEventHash(event, encodingVersion) != event.hash) {
                    results += LinkResult(index, event.seq, LinkStatus.HASH_MISMATCH, "content hash mismatch")
                    if (firstAnomaly < 0) firstAnomaly = index
                } else {
                    results += LinkResult(index, event.seq, LinkStatus.OK)
                }
            }
            prevHash = event.hash
            chained++
        }

        val intact = results.all {
            it.status == LinkStatus.OK || it.status == LinkStatus.PRE_CHAIN
        } && firstAnomaly < 0
        return ChainResult(
            results = results,
            intact = intact,
            chainedCount = chained,
            preChainCount = preChain,
            firstAnomalyIndex = firstAnomaly,
        )
    }
}
