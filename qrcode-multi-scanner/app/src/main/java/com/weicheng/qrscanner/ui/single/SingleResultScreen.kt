package com.weicheng.qrscanner.ui.single

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.weicheng.qrscanner.data.copyTextToClipboard
import com.weicheng.qrscanner.ui.components.AppTopBar
import com.weicheng.qrscanner.ui.components.ContentCard
import com.weicheng.qrscanner.ui.components.rememberMessageController

/**
 * 单张扫描结果页。
 *
 * 拿到内容后相机页已经停止扫描，这里只负责展示、复制、再来一次。
 */
@Composable
fun SingleResultScreen(
    content: String,
    onRescan: () -> Unit,
    onBackHome: () -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val messages = rememberMessageController()

    Scaffold(
        topBar = { AppTopBar(title = "扫描结果", onBack = onBack) },
        snackbarHost = { SnackbarHost(messages.hostState) },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
        ) {
            Text(
                text = "二维码内容",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(modifier = Modifier.height(8.dp))

            ContentCard(content = content)

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    context.copyTextToClipboard("二维码内容", content)
                    messages.show("已复制到剪贴板")
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
            ) {
                Text("复制到剪贴板")
            }

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedButton(
                onClick = onRescan,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
            ) {
                Text("再次扫描")
            }

            Spacer(modifier = Modifier.height(10.dp))

            TextButton(
                onClick = onBackHome,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("返回首页")
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
