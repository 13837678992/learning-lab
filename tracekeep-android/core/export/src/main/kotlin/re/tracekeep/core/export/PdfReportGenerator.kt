package re.tracekeep.core.export

import re.tracekeep.core.verify.VerificationReport

/**
 * PDF 报告生成（纯 JVM，无第三方依赖；需求 §6；阶段 9）。
 *
 * **语言与编码限制（如实声明，见 DECISIONS D-030）**：
 * PDF 使用内置 Helvetica 字体（标准 14 字体之一），**无法渲染 CJK 字形**。
 * 因此本 PDF 采用 **ASCII 字段标签 + ASCII 值**（哈希、ID、ISO 时间、状态码本身均为 ASCII），
 * 作为**结构化事实摘要**；完整的中文叙述与能力边界声明置于同包的
 * `README.txt`（UTF-8）与 `manifest.json`（UTF-8），二者渲染正确。
 * 不引入 CJK 字体以避免体积/许可证/供应链代价。
 *
 * 内容纪律（需求 §6）：列明媒体/哈希/验证结果/时间来源/位置/异常/缺失/第三方状态；
 * 明确区分设备记录时间与第三方时间证明时间（本版本无）；禁止误导措辞（见 [FORBIDDEN]）。
 */
object PdfReportGenerator {

    private val FORBIDDEN = listOf(
        "司法鉴定报告", "法院认证", "法院必定", "法院必然", "百分之百", "绝对不可篡改",
        "绝对真实", "自动取得司法效力", "保证法律效力",
        // ASCII 形式的越界表述（PDF 中可能以英文出现）
        "guaranteed admissible", "court-certified", "100% valid",
    )

    fun generate(
        manifest: EvidenceManifest,
        verification: VerificationReport?,
        exportVerification: EvidencePackageBuilder.ExportVerification?,
    ): ByteArray {
        val pdf = SimplePdfWriter()
        pdf.addHeading("TraceKeep Evidence Report (auto-generated, ASCII summary)")
        pdf.addLine("This is a technical record, not a legal opinion. Admissibility and weight are")
        pdf.addLine("determined by the competent authority under applicable law. Full Chinese")
        pdf.addLine("description is in README.txt / manifest.json (UTF-8).")
        pdf.addBlank()

        pdf.addHeading("1. Session")
        pdf.addLine("sessionId: ${manifest.sessionId}")
        pdf.addLine("recordingType: ${manifest.recordingType}  state: ${manifest.sessionState}  saveStatus: ${manifest.saveStatus ?: "-"}")
        pdf.addLine("appVersion: ${manifest.appVersionName}  formatVersion: ${manifest.formatVersion}  manifestVersion: ${manifest.manifestVersion}")
        pdf.addBlank()

        pdf.addHeading("2. Time sources (do not confuse)")
        pdf.addLine("device recorded at (NOT a trusted timestamp): ${utc(manifest.deviceRecordedAtWallMs)}")
        pdf.addLine("stoppedAt: ${manifest.stoppedAtWallMs?.let(::utc) ?: "-"}")
        pdf.addLine("savedAt:   ${manifest.savedAtWallMs?.let(::utc) ?: "-"}")
        pdf.addLine("sealedAt:  ${manifest.sealedAtWallMs?.let(::utc) ?: "-"}")
        pdf.addLine("third-party timestamp: none (no timestamp service used)")
        pdf.addBlank()

        pdf.addHeading("3. Media and hashes")
        if (manifest.files.isEmpty()) {
            pdf.addLine("(no file records)")
        } else {
            manifest.files.forEach { f ->
                pdf.addLine("${f.relativePath} [${f.role}/${f.lifecycle}] size=${f.sizeBytes ?: "?"}")
                pdf.addLine("    sha256=${f.sha256 ?: "not-computed"}")
            }
        }
        pdf.addBlank()

        pdf.addHeading("4. Event log and hash chain")
        val e = manifest.events
        pdf.addLine("events: present=${e.present} count=${e.count} unparsable=${e.unparsableLines}")
        pdf.addLine("eventsSha256=${e.sha256 ?: "-"}")
        pdf.addLine("chain: chained=${manifest.hashChain.chainedEventsCount} preChain=${manifest.hashChain.preChainEventsCount} intact=${manifest.hashChain.intact}")
        pdf.addLine("chainHeadHash=${manifest.hashChain.chainHeadHash ?: "-"}")
        pdf.addLine("note: hash chain detects event-sequence changes only; not a trusted timestamp.")
        pdf.addBlank()

        pdf.addHeading("5. Location")
        val loc = manifest.locations
        pdf.addLine("locations: present=${loc.present} count=${loc.count} unparsable=${loc.unparsableLines}")
        pdf.addLine("locationsSha256=${loc.sha256 ?: "-"}")
        pdf.addBlank()

        pdf.addHeading("6. Digital signature")
        val sig = manifest.signature
        if (sig == null) {
            pdf.addLine("not signed (no signature record).")
        } else {
            pdf.addLine("algorithm=${sig.algorithm}  keyId=${sig.keyId}")
            pdf.addLine("keyProtectionLevel=${sig.keyProtectionLevel}")
            pdf.addLine("signedAt=${utc(sig.signedAtWallMs)}")
            pdf.addLine("signedPayloadSha256=${sig.signedPayloadSha256}")
            pdf.addLine("object=${sig.objectType} v${sig.objectVersion}")
            pdf.addLine("note: a valid signature only shows the content was signed by the matching")
            pdf.addLine("      private key; it does not prove identity, truth, or admissibility.")
        }
        pdf.addBlank()

        pdf.addHeading("7. Third-party services")
        pdf.addLine("timestampProvider=${manifest.thirdParty.timestampProvider} preservationProvider=${manifest.thirdParty.preservationProvider} identityProvider=${manifest.thirdParty.identityProvider}")
        pdf.addLine("receipts: none (no third-party preservation/timestamp service used)")
        pdf.addBlank()

        if (manifest.anomalies.isNotEmpty()) {
            pdf.addHeading("8. Anomalies (must read)")
            manifest.anomalies.forEach { pdf.addLine("- ${ascii(it)}") }
            pdf.addBlank()
        }
        if (manifest.missingData.isNotEmpty()) {
            pdf.addHeading("9. Missing data")
            manifest.missingData.forEach { pdf.addLine("- ${ascii(it)}") }
            pdf.addBlank()
        }

        pdf.addHeading("10. Verification results (per item; PASS does not mean truth)")
        if (verification == null) {
            pdf.addLine("verification not run.")
        } else {
            verification.results.forEach { r ->
                pdf.addLine("[${r.status}] ${ascii(r.title)}")
                pdf.addLine("    ${ascii(r.detail)}")
            }
            pdf.addLine("summary: PASS ${verification.passCount} / FAIL ${verification.failCount} / WARN ${verification.warnCount} / SKIPPED ${verification.skippedCount}")
        }
        exportVerification?.let { ev ->
            pdf.addBlank()
            pdf.addLine("export re-check: checked=${ev.filesChecked} match=${ev.filesMatch} mismatches=${ev.mismatches.size} manifestReadable=${ev.manifestMatches}")
            ev.mismatches.forEach { pdf.addLine("   ! ${ascii(it)}") }
        }
        pdf.addBlank()

        pdf.addHeading("11. Capability boundaries (important)")
        pdf.addLine("- Equal hashes only mean unchanged bytes; a hash chain only detects event")
        pdf.addLine("  sequence changes; a signature only shows it was made by the matching key.")
        pdf.addLine("- None of these prove the content was true when recorded, nor that any")
        pdf.addLine("  authority will accept it.")
        pdf.addLine("- Device time is not a trusted timestamp; this package has no third-party time proof.")
        pdf.addLine("- This report is app-generated; it is not notarized, forensically examined, or certified.")

        val bytes = pdf.render()
        val text = String(bytes, Charsets.US_ASCII)
        val hit = FORBIDDEN.firstOrNull { text.contains(it) }
        check(hit == null) { "report contains forbidden wording: $hit" }
        return bytes
    }

    private fun utc(ms: Long): String = java.time.Instant.ofEpochMilli(ms).toString() + "Z(device clock)"

    /** 将可能含非 ASCII 的字符串转为 ASCII 安全形式（非 ASCII 字符替换为 '?'; PDF 字体限制）。 */
    private fun ascii(s: String): String = buildString {
        for (c in s) append(if (c.code in 32..126) c else '?')
    }

    @Suppress("unused")
    private fun labelProtection(p: String) = when (p) {
        "HARDWARE_BACKED" -> "hardware-backed (TEE/StrongBox)"
        "SOFTWARE_BACKED" -> "software-backed (not hardware)"
        else -> "external/unknown"
    }
}
