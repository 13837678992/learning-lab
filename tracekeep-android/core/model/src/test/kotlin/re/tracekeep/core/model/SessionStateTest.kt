package re.tracekeep.core.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** 状态机真值表测试（需求 §2 阶段 2：证据状态机）。 */
class SessionStateTest {

    private val allowed: Map<SessionState, Set<SessionState>> = mapOf(
        SessionState.CREATED to setOf(SessionState.RECORDING, SessionState.ABORTED),
        SessionState.RECORDING to setOf(SessionState.PAUSED, SessionState.STOPPED, SessionState.ABORTED),
        SessionState.PAUSED to setOf(SessionState.RECORDING, SessionState.STOPPED, SessionState.ABORTED),
        SessionState.STOPPED to setOf(SessionState.ABORTED),
        SessionState.SEALED to emptySet(),
        SessionState.ABORTED to emptySet(),
    )

    @Test
    fun transitionTruthTable() {
        for (from in SessionState.entries) {
            for (to in SessionState.entries) {
                assertEquals(
                    "expected transition $from -> $to",
                    to in allowed.getValue(from),
                    from.canTransitionTo(to),
                )
            }
        }
    }

    @Test
    fun sealedAndAbortedAreTerminal() {
        assertTrue(SessionState.SEALED.isTerminal)
        assertTrue(SessionState.ABORTED.isTerminal)
        for (state in listOf(SessionState.CREATED, SessionState.RECORDING, SessionState.PAUSED, SessionState.STOPPED)) {
            assertFalse("$state should not be terminal", state.isTerminal)
        }
    }

    @Test
    fun sealIsNotReachableViaNormalTransition() {
        for (from in SessionState.entries) {
            assertFalse(
                "SEALED must only be entered via the seal flow, not from $from",
                from.canTransitionTo(SessionState.SEALED),
            )
        }
    }

    @Test
    fun exceptionCarriesFromAndTo() {
        val ex = IllegalSessionTransitionException(SessionState.CREATED, SessionState.PAUSED)
        assertEquals(SessionState.CREATED, ex.from)
        assertEquals(SessionState.PAUSED, ex.to)
    }
}
