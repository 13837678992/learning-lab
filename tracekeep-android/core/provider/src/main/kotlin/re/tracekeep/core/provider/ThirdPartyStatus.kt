package re.tracekeep.core.provider

/**
 * 第三方能力状态汇总（供 UI 与报告如实显示"本次记录是否有第三方时间戳/存证/身份认证"）。
 *
 * 纪律：状态值只反映**事实**（未配置 / 未尝试 / 成功 / 失败），不得暗示法律效力。
 */
data class ThirdPartyStatus(
    val timestamp: String,
    val preservation: String,
    val identity: String,
) {
    companion object {
        /** 首版默认：三项全部"未配置"——报告须如实显示"本次记录没有第三方时间戳/存证"。 */
        val NONE = ThirdPartyStatus(
            timestamp = "未配置",
            preservation = "未配置",
            identity = "未配置",
        )

        fun from(
            timestampAvailable: Boolean,
            preservationAvailable: Boolean,
            identityAvailable: Boolean,
        ) = ThirdPartyStatus(
            timestamp = if (timestampAvailable) "已配置" else "未配置",
            preservation = if (preservationAvailable) "已配置" else "未配置",
            identity = if (identityAvailable) "已配置" else "未配置",
        )
    }

    /** 是否全部未配置（报告需据此显式声明"没有第三方时间戳/存证"）。 */
    val allNotConfigured: Boolean
        get() = timestamp == "未配置" && preservation == "未配置" && identity == "未配置"

    /** 供报告/界面的人类可读声明（诚实表述）。 */
    fun honestStatement(): String = if (allNotConfigured) {
        "本次记录没有第三方时间戳、第三方存证或外部身份认证；" +
            "本地哈希、哈希链与签名不能替代第三方时间证明，也不代表内容真实或被法院采信。"
    } else {
        "第三方服务状态：时间戳=$timestamp；存证=$preservation；身份认证=$identity。" +
            "第三方服务不自动证明录制内容在形成之初的真实性。"
    }
}
