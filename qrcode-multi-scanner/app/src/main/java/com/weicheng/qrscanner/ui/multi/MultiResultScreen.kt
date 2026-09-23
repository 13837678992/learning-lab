package com.weicheng.qrscanner.ui.multi

import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.weicheng.qrscanner.data.TextFileExporter
import com.weicheng.qrscanner.data.copyTextToClipboard
import com.weicheng.qrscanner.domain.JoinStrategy
import com.weicheng.qrscanner.domain.ScanFileNames
import com.weicheng.qrscanner.model.ScanSession
import com.weicheng.qrscanner.ui.components.AppTopBar
import com.weicheng.qrscanner.ui.components.ContentCard
import com.weicheng.qrscanner.ui.components.rememberMessageController
import kotlinx.coroutines.launch

/**
 * 最终结果页：按顺序拼接后的完整文本 + 复制全部 + 保存 TXT。
 *
 * 拼接在这里才发生——之前所有环节保存的都是「一张一条」的独立内容。
 *
 * 保存 TXT 分两条路径（都不需要存储权限）：
 * - API 29+：静默写入系统「下载」目录，提示里带上文件名；
 * - API 26–28：弹系统文件选择器，由用户决定位置。
 */
@Composable
fun MultiResultScreen(
    session: ScanSession,
    joinStrategy: JoinStrategy,
    onRestart: () -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val messages = rememberMessageController()
    val scope = rememberCoroutineScope()

    val joinedText = remember(session, joinStrategy) { session.join(joinStrategy) }

    var isSaving by remember { mutableStateOf(false) }
    var showRestartConfirm by remember { mutableStateOf(false) }

    val createDocumentLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument(ScanFileNames.EXTENSION_MIME),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            runCatching { TextFileExporter.writeToUri(context, uri, joinedText) }
                .onSuccess { messages.show("已保存") }
                .onFailure { messages.show("保存失败：${it.message ?: "未知错误"}") }
        }
    }

    fun saveAsTxt() {
        val fileName = ScanFileNames.txtFileNameNow()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (isSaving) return
            isSaving = true
            scope.launch {
                runCatching { TextFileExporter.saveToDownloads(context, fileName, joinedText) }
                    .onSuccess { messages.show("已保存到「下载」目录：$fileName") }
                    .onFailure { messages.show("保存失败：${it.message ?: "未知错误"}") }
                isSaving = false
            }
        } else {
            createDocumentLauncher.launch(fileName)
        }
    }

    Scaffold(
        topBar = { AppTopBar(title = "扫描完成", onBack = onBack) },
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
                text = "共 ${session.count} 张",
                style = MaterialTheme.typography.headlineSmall,
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "最终文本",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(modifier = Modifier.height(8.dp))

            ContentCard(content = joinedText, maxBodyHeight = 400.dp)

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    context.copyTextToClipboard("二维码内容", joinedText)
                    messages.show("已复制全部内容到剪贴板")
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
            ) {
                Text("复制全部")
            }

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedButton(
                onClick = { saveAsTxt() },
                enabled = !isSaving,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
            ) {
                Text(if (isSaving) "保存中…" else "保存为 TXT")
            }

            Spacer(modifier = Modifier.height(10.dp))

            TextButton(
                onClick = { showRestartConfirm = true },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("重新扫描")
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    if (showRestartConfirm) {
        AlertDialog(
            onDismissRequest = { showRestartConfirm = false },
            title = { Text("重新开始扫描？") },
            text = { Text("当前任务的 ${session.count} 张结果会被清空，请先确认已复制或保存。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRestartConfirm = false
                        onRestart()
                    },
                ) {
                    Text("重新扫描")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRestartConfirm = false }) {
                    Text("取消")
                }
            },
        )
    }
}
