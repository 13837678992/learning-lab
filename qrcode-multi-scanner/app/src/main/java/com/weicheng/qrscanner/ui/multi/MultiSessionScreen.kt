package com.weicheng.qrscanner.ui.multi

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.weicheng.qrscanner.model.ScanItem
import com.weicheng.qrscanner.model.ScanSession
import com.weicheng.qrscanner.ui.components.AppTopBar

/**
 * 多张合并的主界面：显示已扫描数量、每张的独立条目，以及「扫描下一张 / 完成」。
 *
 * 设计要点：
 * - 「已扫描 N 张」常驻在顶部，用户任何时候都知道进度（需求 15）；
 * - 刚扫完返回本页时，顶部高亮显示「第 N 张扫描成功」，给出明确反馈，
 *   但绝不自动跳去扫下一张（需求 4）；
 * - 每个条目可点进去查看 / 删除，保证顺序与内容都可控。
 */
@Composable
fun MultiSessionScreen(
    session: ScanSession,
    lastAppendedIndex: Int?,
    onScanNext: () -> Unit,
    onOpenItem: (ScanItem) -> Unit,
    onFinish: () -> Unit,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = { AppTopBar(title = "多张合并", onBack = onBack) },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize(),
        ) {
            Text(
                text = "已扫描 ${session.count} 张",
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
            )

            if (lastAppendedIndex != null) {
                ScanSuccessBanner(index = lastAppendedIndex)
            }

            if (session.isEmpty) {
                EmptyHint(modifier = Modifier.weight(1f))
            } else {
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentPadding = PaddingValues(
                        horizontal = 20.dp,
                        vertical = 8.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(items = session.items, key = { it.id }) { item ->
                        ScanItemRow(item = item, onClick = { onOpenItem(item) })
                    }
                }
            }

            ActionBar(
                canFinish = !session.isEmpty,
                onScanNext = onScanNext,
                onFinish = onFinish,
            )
        }
    }
}

@Composable
private fun ScanSuccessBanner(index: Int) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.primaryContainer,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = "第 $index 张扫描成功",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }
}

@Composable
private fun ScanItemRow(item: ScanItem, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(30.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = item.index.toString(),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onPrimary,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "第 ${item.index} 张",
                    style = MaterialTheme.typography.titleSmall,
                )
                Text(
                    // 列表里只给一行预览，完整内容进详情页看；换行压成空格避免行高跳动。
                    text = item.content.replace('\n', ' '),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = "${item.contentLength} 个字符",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = "查看第 ${item.index} 张",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun EmptyHint(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "还没有扫描任何二维码",
            style = MaterialTheme.typography.titleSmall,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "扫描顺序就是最终的拼接顺序，\n请按二维码的先后顺序逐张扫描。",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ActionBar(
    canFinish: Boolean,
    onScanNext: () -> Unit,
    onFinish: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Button(
            onClick = onScanNext,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
        ) {
            Text("扫描下一张")
        }

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedButton(
            onClick = onFinish,
            enabled = canFinish,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
        ) {
            Text("完成")
        }
    }
}
