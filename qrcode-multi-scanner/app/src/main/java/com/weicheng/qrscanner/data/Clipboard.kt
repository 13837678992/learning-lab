package com.weicheng.qrscanner.data

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context

/**
 * 写入系统剪贴板。
 *
 * 使用 `newPlainText`，让剪贴板只包含纯文本，避免任何额外标记泄露来源。
 */
fun Context.copyTextToClipboard(label: String, text: String) {
    val manager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    manager.setPrimaryClip(ClipData.newPlainText(label, text))
}
