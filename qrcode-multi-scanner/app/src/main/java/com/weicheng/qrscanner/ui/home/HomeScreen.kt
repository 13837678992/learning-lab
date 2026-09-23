package com.weicheng.qrscanner.ui.home

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.weicheng.qrscanner.ui.components.AppTopBar

/**
 * 首页。
 *
 * 刻意只有两个入口，没有登录、设置、历史（历史属第二阶段）。
 * 下面的说明卡片是为了让第一次使用的用户知道「多张合并」该怎么操作——
 * 这是本应用唯一的理解成本。
 */
@Composable
fun HomeScreen(
    onSingleScan: () -> Unit,
    onMultiScan: () -> Unit,
) {
    Scaffold(topBar = { AppTopBar(title = "二维码扫描器") }) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 16.dp),
        ) {
            Text(
                text = "扫描单张二维码，或将多个二维码按顺序拼接成完整文本。",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(modifier = Modifier.height(28.dp))

            Button(
                onClick = onSingleScan,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
            ) {
                Text("单张扫描", style = MaterialTheme.typography.titleMedium)
            }

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = onMultiScan,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
            ) {
                Text("多张合并", style = MaterialTheme.typography.titleMedium)
            }

            Spacer(modifier = Modifier.height(32.dp))

            MultiScanHint()
        }
    }
}

@Composable
private fun MultiScanHint() {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "多张合并怎么用",
                style = MaterialTheme.typography.titleSmall,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "扫描 → 确认 → 下一张，一张一张来。\n" +
                    "每扫到一张就停下来等你操作，不会自动连着扫。\n" +
                    "全部扫完后点「完成」，按扫描顺序拼成完整文本，可复制或存成 TXT。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
