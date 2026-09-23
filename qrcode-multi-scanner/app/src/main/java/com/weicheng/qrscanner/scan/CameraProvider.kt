package com.weicheng.qrscanner.scan

import android.content.Context
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * 以挂起函数的方式获取 [ProcessCameraProvider]。
 *
 * CameraX 只提供 `ListenableFuture`，直接 await 需要额外引入 guava/concurrent-futures-ktx；
 * 这里用 `suspendCancellableCoroutine` 包一层，省掉一个依赖。
 */
suspend fun awaitCameraProvider(context: Context): ProcessCameraProvider =
    suspendCancellableCoroutine { continuation ->
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener(
            {
                runCatching { future.get() }
                    .onSuccess { provider -> continuation.resume(provider) }
                    .onFailure { error -> continuation.resumeWithException(error) }
            },
            ContextCompat.getMainExecutor(context),
        )
    }
