package re.tracekeep.app.recording

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.IOException
import java.nio.file.Path
import re.tracekeep.core.recording.AudioRecordingConfig
import re.tracekeep.core.recording.EngineResult
import re.tracekeep.core.recording.RecordingEngine

/**
 * MediaRecorder 录音引擎（Android 实现；需求 §3）。
 *
 * 诚实性约束：
 * - 录音参数（采样率/位率）作为请求参数在会话启动时记录（标注 requested=true），
 *   本引擎不宣称设备实际采用了这些参数；实际输出参数由 `AudioOutputInspector` 停止后
 *   尽力读回并标注 observed=true；
 * - [stop] 只在 `MediaRecorder.stop()` 成功（容器封装完成）后返回 Ok；
 *   失败（如无有效数据/封装失败）返回 Failure，由控制器标记文件未完成（绝不冒充成功）；
 * - [abort] 尽力释放资源；**不删除、不改写**已写入的目标文件。
 *
 * 已知设备差异：部分设备/ROM 对 pause/resume 或特定编码器支持不一致，
 * 失败路径由控制器如实记录（ENGINE_ACTION_FAILED），不在本类掩饰。
 */
class MediaRecorderEngine(
    private val context: Context,
    private val audioConfig: AudioRecordingConfig,
    private val onError: (String) -> Unit,
) : RecordingEngine {

    private var recorder: MediaRecorder? = null

    override fun outputFileNames(): List<String> = listOf("media.${audioConfig.fileExtension}")

    override fun start(outputFiles: Map<String, Path>): EngineResult {
        val targetFile = outputFiles.values.firstOrNull()
            ?: return EngineResult.Failure("no output file provided")
        if (recorder != null) return EngineResult.Failure("engine already started")
        val mr = newRecorder()
        return try {
            mr.setAudioSource(MediaRecorder.AudioSource.MIC)
            mr.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            mr.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            mr.setAudioSamplingRate(audioConfig.sampleRateHz)
            mr.setAudioChannels(audioConfig.channelCount)
            mr.setAudioEncodingBitRate(audioConfig.bitRateBps)
            mr.setOutputFile(targetFile.toFile().absolutePath)
            mr.setOnErrorListener { _, what, extra ->
                // 异步错误（如设备中断）：通知控制器走 onEngineError 路径
                onError("MediaRecorder error what=$what extra=$extra")
            }
            mr.prepare()
            mr.start()
            recorder = mr
            EngineResult.Ok
        } catch (e: IOException) {
            releaseQuietly(mr)
            EngineResult.Failure("prepare failed: ${e.message}")
        } catch (e: IllegalStateException) {
            releaseQuietly(mr)
            EngineResult.Failure("start failed: ${e.message}")
        } catch (e: RuntimeException) {
            releaseQuietly(mr)
            EngineResult.Failure("start failed: ${e.message}")
        }
    }

    override fun pause(): EngineResult {
        val mr = recorder ?: return EngineResult.Failure("not started")
        return try {
            mr.pause()
            EngineResult.Ok
        } catch (e: IllegalStateException) {
            EngineResult.Failure("pause failed: ${e.message}")
        }
    }

    override fun resume(): EngineResult {
        val mr = recorder ?: return EngineResult.Failure("not started")
        return try {
            mr.resume()
            EngineResult.Ok
        } catch (e: IllegalStateException) {
            EngineResult.Failure("resume failed: ${e.message}")
        }
    }

    override fun stop(): EngineResult {
        val mr = recorder ?: return EngineResult.Failure("not started")
        return try {
            // stop() 成功即代表容器封装完成；失败的 RuntimeException 表示无有效数据/封装失败
            mr.stop()
            releaseQuietly(mr)
            recorder = null
            EngineResult.Ok
        } catch (e: RuntimeException) {
            releaseQuietly(mr)
            recorder = null
            EngineResult.Failure("stop failed (muxer): ${e.message}")
        }
    }

    override fun abort() {
        val mr = recorder ?: return
        recorder = null
        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                runCatching { mr.stop() }
            }
        }
        releaseQuietly(mr)
    }

    @Suppress("DEPRECATION")
    private fun newRecorder(): MediaRecorder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            MediaRecorder()
        }

    private fun releaseQuietly(mr: MediaRecorder) {
        runCatching { mr.reset() }
        runCatching { mr.release() }
    }
}
