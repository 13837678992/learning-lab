package re.tracekeep.core.export

import java.io.ByteArrayOutputStream
import java.nio.charset.StandardCharsets

/**
 * 极简 PDF 写出器（纯 JVM，无第三方依赖；阶段 9）。
 *
 * 仅实现本项目报告所需：多页、内置 Helvetica（普通/加粗）、左对齐文本行。
 * 设计取舍：不引入 PDF 库以获得**确定性输出与最小依赖**（许可证与供应链风险最低），
 * 代价是排版能力有限（无表格/图片/自定义字体）——报告以文本行呈现，满足需求 §6 的
 * 「列明原始媒体、哈希值、验证结果、时间来源、位置精度、异常中断、缺失区间、第三方凭证及验证结果」。
 *
 * 注意：PDF 只是**人类可读的呈现层**；机器可读事实以 manifest.json 与 verification/ 为准。
 */
class SimplePdfWriter {

    private data class Line(val text: String, val bold: Boolean, val size: Float)

    private val pages = mutableListOf<MutableList<Line>>()
    private var current = mutableListOf<Line>()

    /** 页面尺寸 A4（点：595×842），留边 50。 */
    private val width = 595f
    private val height = 842f
    private val margin = 50f
    private val lineHeight = 14f
    private var y = 0f

    fun addHeading(text: String) {
        ensureSpace(24f)
        pushLine(Line(text, bold = true, size = 15f))
    }

    fun addLine(text: String, bold: Boolean = false) {
        ensureSpace(lineHeight)
        pushLine(Line(text, bold = bold, size = 10f))
    }

    fun addBlank() {
        ensureSpace(lineHeight)
        pushLine(Line("", bold = false, size = 10f))
    }

    private fun pushLine(line: Line) {
        current += line
        y -= lineHeight
    }

    private fun ensureSpace(needed: Float) {
        if (y - needed < margin) {
            pages += current
            current = mutableListOf()
            y = height - margin
        }
    }

    /** 渲染为 PDF 字节（确定性；同一输入 → 同一字节序列）。 */
    fun render(): ByteArray {
        if (current.isNotEmpty() || pages.isEmpty()) pages += current

        val objects = mutableListOf<String>()
        // 预留对象号：1=Catalog, 2=Pages, 3=Font(normal), 4=Font(bold), 5..=Page+Contents pairs
        val pageObjIds = mutableListOf<Int>()
        val contentObjIds = mutableListOf<Int>()
        var nextId = 5
        for (p in pages) {
            pageObjIds += nextId++
            contentObjIds += nextId++
        }

        fun escape(s: String): String = buildString {
            for (c in s) when (c) {
                '(' -> append("\\(")
                ')' -> append("\\)")
                '\\' -> append("\\\\")
                else -> if (c.code in 32..126) append(c) else append('?')
            }
        }

        // 内容流
        val contentStreams = pages.mapIndexed { idx, lines ->
            val sb = StringBuilder()
            sb.append("BT\n")
            var cursor = height - margin
            for (line in lines) {
                val font = if (line.bold) "/F2" else "/F1"
                sb.append(font).append(' ').append(fmt(line.size)).append(" Tf\n")
                sb.append("1 0 0 1 ").append(fmt(margin)).append(' ').append(fmt(cursor)).append(" Tm\n")
                sb.append('(').append(escape(line.text)).append(") Tj\n")
                cursor -= lineHeight
            }
            sb.append("ET")
            sb.toString()
        }

        val sb = StringBuilder()
        sb.append("%PDF-1.4\n")
        val offsets = mutableListOf<Int>()

        fun addObj(id: Int, body: String) {
            while (offsets.size < id) offsets += 0
            offsets[id - 1] = sb.length
            sb.append(id).append(" 0 obj\n").append(body).append("\nendobj\n")
        }

        addObj(1, "<< /Type /Catalog /Pages 2 0 R >>")
        val kids = pageObjIds.joinToString(" ") { "$it 0 R" }
        addObj(2, "<< /Type /Pages /Kids [$kids] /Count ${pages.size} >>")
        addObj(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        addObj(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
        pages.forEachIndexed { i, _ ->
            val pageId = pageObjIds[i]
            val contentId = contentObjIds[i]
            val stream = contentStreams[i]
            val streamBytes = stream.toByteArray(StandardCharsets.US_ASCII)
            addObj(
                pageId,
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(width)} ${fmt(height)}] " +
                    "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents $contentId 0 R >>",
            )
            addObj(contentId, "<< /Length ${streamBytes.size} >>\nstream\n$stream\nendstream")
        }

        val xrefOffset = sb.length
        val total = offsets.size + 1
        sb.append("xref\n0 $total\n")
        sb.append("0000000000 65535 f \n")
        offsets.forEach { sb.append(String.format("%010d 00000 n \n", it)) }
        sb.append("trailer\n<< /Size $total /Root 1 0 R >>\nstartxref\n$xrefOffset\n%%EOF")

        return sb.toString().toByteArray(StandardCharsets.US_ASCII)
    }

    private fun fmt(v: Float): String =
        if (v == v.toInt().toFloat()) v.toInt().toString() else String.format("%.2f", v)
}

/** 便于测试：捕获渲染字节（与文件写出等价）。 */
fun SimplePdfWriter.toByteArray(): ByteArray {
    val out = ByteArrayOutputStream()
    out.write(render())
    return out.toByteArray()
}
