package com.weicheng.qrscanner.ui.components

import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch

/**
 * 轻量提示控制器，统一处理「复制成功 / 保存成功」这类一次性反馈。
 *
 * 新消息会顶掉当前正在显示的消息，避免连续操作时提示排队、越积越多。
 */
class MessageController(
    val hostState: SnackbarHostState,
    val show: (String) -> Unit,
)

@Composable
fun rememberMessageController(): MessageController {
    val hostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    return remember(hostState, scope) {
        MessageController(hostState) { message ->
            scope.launch {
                hostState.currentSnackbarData?.dismiss()
                hostState.showSnackbar(message)
            }
        }
    }
}
