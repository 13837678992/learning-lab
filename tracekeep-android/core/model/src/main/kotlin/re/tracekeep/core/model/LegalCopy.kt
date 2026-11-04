package re.tracekeep.core.model

/**
 * 文案纪律常量（PROJECT_REQUIREMENTS.md §12「最终产品文案」）。
 *
 * 本文件是界面、报告与文档合规表述的单一来源之一：
 * - [PRODUCT_STATEMENT]：需求文档推荐的产品表述，可在 About 页/报告封底直接引用；
 * - [FORBIDDEN_PHRASES]：禁止出现的误导性表述（需求文档 §12 + DECISIONS.md D-006）。
 *
 * 修改本文件前必须先核对 PROJECT_REQUIREMENTS.md 的当前版本。
 */
object LegalCopy {

    /** 推荐产品表述（原文引用需求文档 §12，勿改动措辞）。 */
    const val PRODUCT_STATEMENT: String =
        "TraceKeep 用于帮助用户记录音视频、保存操作与定位信息、校验文件完整性，" +
            "并在接入相应第三方服务时保存可验证的时间或存证凭证。" +
            "证据的真实性、合法性、关联性及证明力仍由具体事实和有权机关依法审查。"

    /**
     * 禁止表述清单（子串匹配用）。
     * 用途：UI/报告文案测试、导出物文本扫描（阶段 9 起）。
     */
    val FORBIDDEN_PHRASES: List<String> = listOf(
        "百分之百有效",
        "法院必定认可",
        "法院必然采信",
        "绝对不可篡改",
        "自动取得司法效力",
        "司法鉴定报告",
        "法院认证",
        "保证法律效力",
        "绝对真实",
        "不可伪造",
    )
}
