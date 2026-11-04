package re.tracekeep.core.model

/**
 * 会话状态机（`PROJECT_REQUIREMENTS.md` §2 阶段 2）。
 *
 * 合法迁移：
 * ```
 * CREATED   → RECORDING | ABORTED
 * RECORDING → PAUSED | STOPPED | ABORTED
 * PAUSED    → RECORDING | STOPPED | ABORTED
 * STOPPED   → ABORTED
 * SEALED    → （终态，不可迁移）
 * ABORTED   → （终态，不可迁移）
 * ```
 * 注意：SEALED 只能通过封存流程（`EvidenceStore.seal()`）进入，不允许用普通状态迁移到达；
 * 封存前置状态为 STOPPED（正常结束）或 ABORTED（中断保全，封存记录必须携带
 * sealedWithIncompleteFiles=true）；校验失败的会话不得标记为完整封存（需求 §5）。
 */
enum class SessionState {
    CREATED,
    RECORDING,
    PAUSED,
    STOPPED,
    SEALED,
    ABORTED;

    val isTerminal: Boolean
        get() = this == SEALED || this == ABORTED

    /** 普通状态迁移是否合法（不含进入 SEALED——只能由封存流程完成）。 */
    fun canTransitionTo(target: SessionState): Boolean = when (this) {
        CREATED -> target == RECORDING || target == ABORTED
        RECORDING -> target == PAUSED || target == STOPPED || target == ABORTED
        PAUSED -> target == RECORDING || target == STOPPED || target == ABORTED
        STOPPED -> target == ABORTED
        SEALED, ABORTED -> false
    }
}

class IllegalSessionTransitionException(val from: SessionState, val to: SessionState) :
    IllegalStateException("Illegal session transition: $from -> $to")
