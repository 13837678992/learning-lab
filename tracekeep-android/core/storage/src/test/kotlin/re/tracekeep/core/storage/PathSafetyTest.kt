package re.tracekeep.core.storage

import java.nio.file.Path
import org.junit.Assert.assertEquals
import org.junit.Test

/** 路径安全测试（需求 §8：导出包路径穿越防护的同源约束）。 */
class PathSafetyTest {

    // ------------------------------------------------------ session id

    @Test
    fun safeSessionIds_accepted() {
        PathSafety.requireSafeSessionId("abc-123")
        PathSafety.requireSafeSessionId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    }

    @Test(expected = UnsafePathException::class)
    fun traversalSessionId_rejected() {
        PathSafety.requireSafeSessionId("../etc")
    }

    @Test(expected = UnsafePathException::class)
    fun slashSessionId_rejected() {
        PathSafety.requireSafeSessionId("a/b")
    }

    @Test(expected = UnsafePathException::class)
    fun uppercaseSessionId_rejected() {
        PathSafety.requireSafeSessionId("ABC")
    }

    @Test(expected = UnsafePathException::class)
    fun emptySessionId_rejected() {
        PathSafety.requireSafeSessionId("")
    }

    // ------------------------------------------------------ relative path

    @Test
    fun validRelativePath_returnsNormalized() {
        assertEquals(
            Path.of("media/rec.m4a"),
            PathSafety.requireSafeRelativePath("media/rec.m4a", "media"),
        )
    }

    @Test(expected = UnsafePathException::class)
    fun traversalRelativePath_rejected() {
        PathSafety.requireSafeRelativePath("media/../../etc/passwd", "media")
    }

    @Test(expected = UnsafePathException::class)
    fun absoluteRelativePath_rejected() {
        PathSafety.requireSafeRelativePath("/etc/passwd", "media")
    }

    @Test(expected = UnsafePathException::class)
    fun backslashRelativePath_rejected() {
        PathSafety.requireSafeRelativePath("media\\rec.m4a", "media")
    }

    @Test(expected = UnsafePathException::class)
    fun wrongRootRelativePath_rejected() {
        PathSafety.requireSafeRelativePath("other/rec.m4a", "media")
    }

    @Test(expected = UnsafePathException::class)
    fun bareFileNameWithoutRoot_rejected() {
        PathSafety.requireSafeRelativePath("rec.m4a", "media")
    }

    // ------------------------------------------------------ resolveInside

    @Test
    fun resolveInside_keepsPathUnderRoot() {
        val root = Path.of("/tmp/evidence")
        assertEquals(
            Path.of("/tmp/evidence/media/a.m4a"),
            PathSafety.resolveInside(root, Path.of("media/a.m4a")),
        )
    }

    @Test(expected = UnsafePathException::class)
    fun resolveInside_escapesRejected() {
        val root = Path.of("/tmp/evidence")
        PathSafety.resolveInside(root, Path.of("../outside.txt"))
    }
}
