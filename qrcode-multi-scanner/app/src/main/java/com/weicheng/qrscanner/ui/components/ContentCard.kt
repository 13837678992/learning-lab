package com.weicheng.qrscanner.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * 二维码内容展示块：等宽字体 + 可选中 + 内部滚动 + 字符数。
 *
 * 用等宽字体是因为二维码里常常是配置、代码或 JSON，等宽更易读；
 * 用 [SelectionContainer] 是因为「能手动选中一段复制」比只有一键复制更实用。
 *
 * 内容本身不做任何加工，原样显示——所见即二维码原文。
 */
@Composable
fun ContentCard(
    content: String,
    modifier: Modifier = Modifier,
    maxBodyHeight: Dp = 360.dp,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            SelectionContainer {
                Text(
                    text = content.ifEmpty { "（空内容）" },
                    style = MaterialTheme.typography.bodyMedium,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = maxBodyHeight)
                        .verticalScroll(rememberScrollState()),
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "共 ${content.length} 个字符",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
