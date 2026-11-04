package re.tracekeep.core.provider

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 阶段 8 接口层测试：第三方状态汇总的诚实性语义。
 */
class ThirdPartyStatusTest {

    @Test
    fun none_allNotConfigured_statementDeniesThirdPartyProof() {
        val s = ThirdPartyStatus.NONE
        assertTrue(s.allNotConfigured)
        val stmt = s.honestStatement()
        assertTrue(stmt.contains("没有第三方时间戳"))
        // 不得出现任何"已具备/已被采信"式误导
        listOf("采信", "法律效力", "必定", "百分之百").forEach {
            assertFalse("声明不得含误导词：$it", stmt.contains(it) && !stmt.contains("不代表") && !stmt.contains("不能"))
        }
    }

    @Test
    fun configured_notAllNotConfigured() {
        val s = ThirdPartyStatus.from(timestampAvailable = true, preservationAvailable = false, identityAvailable = false)
        assertFalse(s.allNotConfigured)
        assertEquals("已配置", s.timestamp)
        assertEquals("未配置", s.preservation)
    }

    @Test
    fun noOpPreservation_reportsNotAttempted() {
        val r = NoOpEvidencePreservationProvider.submit(PreservationRequest(SubmissionScope.DigestOnly("d"), "d"))
        assertTrue(r is PreservationResult.NotAttempted)
        assertTrue(NoOpEvidencePreservationProvider.availability() is PreservationAvailability.NotConfigured)
    }
}
