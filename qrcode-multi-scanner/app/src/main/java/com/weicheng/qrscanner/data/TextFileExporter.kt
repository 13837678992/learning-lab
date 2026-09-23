package com.weicheng.qrscanner.data

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.annotation.RequiresApi
import com.weicheng.qrscanner.domain.ScanFileNames
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * TXT 导出。
 *
 * 两条路径，都不需要申请任何存储权限：
 * - API 29+：写入 MediaStore 的「下载」集合，静默完成，文件出现在「下载」目录；
 * - API 26–28：走 SAF（`ACTION_CREATE_DOCUMENT`），由系统返回可写 uri。
 *
 * 之所以不用 `WRITE_EXTERNAL_STORAGE`，是因为在 Android 10 之后该权限对下载目录
 * 已无实际作用，而在 26–28 上走 SAF 同样无需授权，可以完全不碰存储权限。
 *
 * 内容一律按 UTF-8 写出，保证中文不出现乱码。
 */
object TextFileExporter {

    /**
     * API 29+：写入系统「下载」目录。
     *
     * 标注 [RequiresApi] 是必需的：`MediaStore.Downloads` 是 API 29 才有的 API，
     * lint 不认识 `check(SDK_INT >= Q)` 这种运行时断言，只有注解才能让
     * lintVitalRelease 通过（否则 release 构建会报 NewApi 错误）。
     * 调用方已在 `if (SDK_INT >= Q)` 分支里，lint 能识别该分支。
     */
    @RequiresApi(Build.VERSION_CODES.Q)
    suspend fun saveToDownloads(context: Context, fileName: String, content: String): Uri =
        withContext(Dispatchers.IO) {
            val resolver = context.contentResolver
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, ScanFileNames.EXTENSION_MIME)
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                // IS_PENDING=1 期间其他应用看不到该文件，写完再置 0，避免读到半截内容。
                put(MediaStore.Downloads.IS_PENDING, 1)
            }

            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: error("无法在「下载」目录创建文件")

            try {
                resolver.openOutputStream(uri)?.use { output ->
                    output.write(content.toByteArray(Charsets.UTF_8))
                } ?: error("无法打开文件输出流")

                values.clear()
                values.put(MediaStore.Downloads.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
            } catch (throwable: Throwable) {
                // 写入失败时清掉残留的空文件，避免用户看到 0 字节的 txt。
                resolver.delete(uri, null, null)
                throw throwable
            }

            uri
        }

    /** API 26–28：写入 SAF 返回的 uri。 */
    suspend fun writeToUri(context: Context, uri: Uri, content: String) =
        withContext(Dispatchers.IO) {
            context.contentResolver.openOutputStream(uri)?.use { output ->
                output.write(content.toByteArray(Charsets.UTF_8))
            } ?: error("无法打开文件输出流")
        }
}
