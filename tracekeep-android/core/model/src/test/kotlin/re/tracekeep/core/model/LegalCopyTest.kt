package re.tracekeep.core.model

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LegalCopyTest {

    @Test
    fun productStatement_containsNoForbiddenPhrases() {
        for (phrase in LegalCopy.FORBIDDEN_PHRASES) {
            assertFalse(
                "产品表述不得包含禁止措辞：$phrase",
                LegalCopy.PRODUCT_STATEMENT.contains(phrase),
            )
        }
    }

    @Test
    fun forbiddenPhrases_coverRequirementsSection12() {
        // 需求 §12 明确列举的禁止表述必须被清单拦截（子串匹配）
        val required = listOf(
            "录制后百分之百有效",
            "法院必定认可",
            "法院必然采信",
            "绝对不可篡改",
            "自动取得司法效力",
        )
        for (text in required) {
            assertTrue(
                "禁止清单须能拦截需求 §12 表述：$text",
                LegalCopy.FORBIDDEN_PHRASES.any { text.contains(it) },
            )
        }
    }
}
