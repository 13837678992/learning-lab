package re.tracekeep.app.recording

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioPlaybackCaptureConfiguration
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.projection.MediaProjection
import android.os.Build
import android.util.DisplayMetrics
import android.view.WindowManager
import androidx.core.content.ContextCompat
import java.io.FileOutputStream
import java.io.IOException
import java.nio.file.Path
import java.util.concurrent.atomic.AtomicBoolean
import re.tracekeep.core.recording.EngineResult
import re.tracekeep.core.recording.RecordingEngine
import re.tracekeep.core.recording.ScreenAudioSource
import re.tracekeep.core.recording.ScreenRecordingConfig
import re.tracekeep.core.recording.WavPacker

/**
 * 屏幕录制引擎（需求 §3 录屏；阶段 5）。
 *
 * 实现要点与诚实性约束：
 * - **MediaProjection 官方授权流程**：每次会话由 UI 走系统授权对话框取得令牌
 *   （[projection] 在进入本类前已获取；应用无法自行创建，也不缓存授权）；
 * - **Android 14+ 顺序要求**：MediaProjection 令牌的 `getMediaProjection` 必须在
 *   `mediaProjection` 类型前台服务已启动**之后**调用——该顺序由
 *   [RecordingSessionHolder] 保证（先起服务、后取令牌、再启动引擎）；
 * - 音频来源三态（[ScreenAudioSource]）：
 *   - NONE：无音轨；
 *   - MICROPHONE：MediaRecorder 麦克风音轨（需 RECORD_AUDIO 运行时权限）；
 *   - INTERNAL：应用内部播放声音（`AudioPlaybackCaptureConfiguration`，**仅 API 29+**）
 *     ——单独用 AudioRecord 采集并写为 **WAV 原始轨文件**（第二个输出），
 *     与屏幕视频并列登记为独立原始件；API < 29 时**如实失败**（不静默降级为无音频）；
 * - **受保护内容**（FLAG_SECURE 窗口、DRM 等）系统层面不可录制——引擎不做任何绕过，
 *   录出的画面即系统允许采集的内容；此限制在文档与事件中如实披露；
 * - 应用自身不在受保护列表（如需排除自身 UI，属将来增强，当前版本如实记录"包含本应用画面"）；
 * - [stop] 在 MediaRecorder 封装完成（`stop()` 成功）后返回 Ok；内部音频 WAV 以
 *   头部回填收尾；任一环节失败如实返回 Failure，由控制器标记未完成。
 *
 * 已知限制（真机待验）：部分 ROM 对内部音频采集有额外限制（如静音播放）；
 * 竖屏/横屏切换的尺寸变化本次不重建虚拟显示（以启动时尺寸为准，旋转后画面会留边）；
 * 帧率/分辨率协商因设备而异。
 */
class ScreenRecorderEngine(
    private val context: Context,
    private val projection: MediaProjection,
    private val config: ScreenRecordingConfig,
    private val onError: (String) -> Unit,
) : RecordingEngine {

    private var recorder: MediaRecorder? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var internalAudioRecorder: AudioRecord? = null
    private var internalAudioThread: Thread? = null
    private val internalAudioStop = AtomicBoolean(false)

    override fun outputFileNames(): List<String> {
        val names = mutableListOf("screen.${config.fileExtension}")
        if (config.audioSource == ScreenAudioSource.INTERNAL) {
            names += "internal-audio.wav"
        }
        return names
    }

    override fun start(outputFiles: Map<String, Path>): EngineResult {
        if (recorder != null) return EngineResult.Failure("engine already started")
        val videoFile = outputFiles.values.firstOrNull()
            ?: return EngineResult.Failure("no output file provided")

        // 前置校验（如实失败，不静默降级）
        if (config.audioSource == ScreenAudioSource.MICROPHONE &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return EngineResult.Failure("microphone permission not granted for audio source MICROPHONE")
        }
        if (config.audioSource == ScreenAudioSource.INTERNAL && Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return EngineResult.Failure(
                "internal audio capture requires Android 10 (API 29+); current sdk=${Build.VERSION.SDK_INT}",
            )
        }

        val metrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager)
            .defaultDisplay.getRealMetrics(metrics)
        val width = metrics.widthPixels
        val height = metrics.heightPixels
        val density = metrics.densityDpi

        // MediaProjection 回调：系统主动停止（如用户从通知停止屏幕共享）→ 上报为引擎错误
        projection.registerCallback(
            object : MediaProjection.Callback() {
                override fun onStop() {
                    onError("screen capture stopped by system (projection callback)")
                }
            },
            android.os.Handler(android.os.Looper.getMainLooper()),
        )

        val mr = newRecorder()
        return try {
            // MediaRecorder 状态机顺序要求（真实缺陷修复，2026-10-30 模拟器实测）：
            // **setAudioSource / setVideoSource 必须全部在 setOutputFormat 之前调用**——
            // 在 setOutputFormat 之后设置音频源会抛无 message 的 IllegalStateException。
            mr.setVideoSource(MediaRecorder.VideoSource.SURFACE)
            if (config.audioSource == ScreenAudioSource.MICROPHONE) {
                mr.setAudioSource(MediaRecorder.AudioSource.MIC)
            }
            mr.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            mr.setVideoEncoder(MediaRecorder.VideoEncoder.H264)
            mr.setVideoSize(width, height)
            mr.setVideoFrameRate(30)
            mr.setVideoEncodingBitRate(videoBitRate(width, height))
            if (config.audioSource == ScreenAudioSource.MICROPHONE) {
                mr.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                mr.setAudioSamplingRate(44_100)
                mr.setAudioChannels(1)
                mr.setAudioEncodingBitRate(128_000)
            }
            // 内部音频不经 MediaRecorder（独立 AudioRecord → WAV 输出）：无需音频编码器
            mr.setOutputFile(videoFile.toFile().absolutePath)
            mr.setOnErrorListener { _, what, extra ->
                onError("screen MediaRecorder error what=$what extra=$extra")
            }
            mr.prepare()

            // VirtualDisplay 绑定到 MediaRecorder 的输入 Surface
            virtualDisplay = projection.createVirtualDisplay(
                "tracekeep-screen",
                width, height, density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                mr.surface,
                null, null,
            )
            mr.start()
            recorder = mr

            if (config.audioSource == ScreenAudioSource.INTERNAL) {
                val wavFile = outputFiles.entries
                    .firstOrNull { it.key.endsWith(".wav") }?.value
                    ?: return startInternalAudioFailure(mr, "internal audio output file not provided")
                val audioResult = startInternalAudio(wavFile)
                if (audioResult is EngineResult.Failure) {
                    return startInternalAudioFailure(mr, audioResult.reason)
                }
            }
            EngineResult.Ok
        } catch (e: IOException) {
            releaseQuietly(mr)
            EngineResult.Failure("screen prepare failed: ${describe(e)}")
        } catch (e: IllegalStateException) {
            releaseQuietly(mr)
            EngineResult.Failure("screen start failed (MediaRecorder state): ${describe(e)}")
        } catch (e: SecurityException) {
            // Android 14+：未先启动 mediaProjection 前台服务时 getMediaProjection/createVirtualDisplay 抛此异常
            releaseQuietly(mr)
            EngineResult.Failure("screen start denied (media projection token invalid): ${describe(e)}")
        } catch (e: RuntimeException) {
            releaseQuietly(mr)
            EngineResult.Failure("screen start failed: ${describe(e)}")
        }
    }

    /** 异常描述：message 为空时回落为异常类名（避免事件日志出现无信息的 "null"）。 */
    private fun describe(e: Throwable): String =
        e.message?.takeIf { it.isNotBlank() } ?: e::class.java.simpleName

    private fun startInternalAudioFailure(mr: MediaRecorder, reason: String): EngineResult {
        runCatching { mr.stop() }
        releaseQuietly(mr)
        runCatching { virtualDisplay?.release() }
        virtualDisplay = null
        return EngineResult.Failure("internal audio start failed: $reason")
    }

    /** 内部音频：AudioRecord(播放捕获) → PCM 写 WAV（44.1kHz/单声道/16bit）。 */
    private fun startInternalAudio(wavFile: Path): EngineResult {
        // AudioPlaybackCaptureConfiguration 本身即 API 29 类：必须在任何引用之前判定版本，
        // 否则 API 26–28 上会在类加载阶段抛 NoClassDefFoundError，而非按 D-026 如实返回 Failure。
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return EngineResult.Failure("internal audio requires API 29+")
        }
        if (context.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) !=
            android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return EngineResult.Failure("RECORD_AUDIO permission not granted (required for playback capture)")
        }
        return startInternalAudioQ(wavFile)
    }

    @androidx.annotation.RequiresApi(Build.VERSION_CODES.Q)
    @androidx.annotation.RequiresPermission(android.Manifest.permission.RECORD_AUDIO)
    private fun startInternalAudioQ(wavFile: Path): EngineResult {
        return try {
            val cfg = AudioPlaybackCaptureConfiguration.Builder(projection)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                .addMatchingUsage(AudioAttributes.USAGE_GAME)
                .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                .build()
            val format = AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(INTERNAL_AUDIO_SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                .build()
            val minBuf = AudioRecord.getMinBufferSize(
                INTERNAL_AUDIO_SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
            )
            val record = AudioRecord.Builder()
                .setAudioFormat(format)
                .setBufferSizeInBytes(minBuf * 2)
                .setAudioPlaybackCaptureConfig(cfg)
                .build()
            if (record.state != AudioRecord.STATE_INITIALIZED) {
                runCatching { record.release() }
                return EngineResult.Failure("AudioRecord not initialized (device may disallow playback capture)")
            }
            val out = FileOutputStream(wavFile.toFile())
            // 先写 44 字节占位头，停止后回填实际长度
            out.write(ByteArray(WavPacker.HEADER_SIZE))
            internalAudioStop.set(false)
            val thread = Thread({
                val buf = ByteArray(minBuf * 2)
                record.startRecording()
                try {
                    while (!internalAudioStop.get()) {
                        val read = record.read(buf, 0, buf.size)
                        if (read > 0) {
                            out.write(buf, 0, read)
                        } else if (read < 0) {
                            onError("internal audio read error code=$read")
                            break
                        }
                    }
                } catch (e: Exception) {
                    onError("internal audio capture error: ${e.message}")
                } finally {
                    runCatching { record.stop() }
                    runCatching { record.release() }
                    runCatching { out.flush(); out.close() }
                    runCatching { backfillWavHeader(wavFile) }
                }
            }, "tracekeep-internal-audio")
            internalAudioRecorder = record
            internalAudioThread = thread
            thread.start()
            EngineResult.Ok
        } catch (e: Exception) {
            EngineResult.Failure(e.message ?: e::class.simpleName.orEmpty())
        }
    }

    override fun pause(): EngineResult = EngineResult.Failure("screen recording pause is not supported")

    override fun resume(): EngineResult = EngineResult.Failure("screen recording resume is not supported")

    override fun stop(): EngineResult {
        val mr = recorder ?: return EngineResult.Failure("not started")
        return try {
            mr.stop() // 成功 = 容器封装完成
            releaseQuietly(mr)
            recorder = null
            virtualDisplay?.release()
            virtualDisplay = null
            stopInternalAudio()
            EngineResult.Ok
        } catch (e: RuntimeException) {
            releaseQuietly(mr)
            recorder = null
            runCatching { virtualDisplay?.release() }
            virtualDisplay = null
            stopInternalAudio()
            EngineResult.Failure("screen stop failed (muxer): ${e.message}")
        }
    }

    override fun abort() {
        val mr = recorder
        recorder = null
        runCatching { mr?.stop() }
        if (mr != null) releaseQuietly(mr)
        runCatching { virtualDisplay?.release() }
        virtualDisplay = null
        stopInternalAudio()
    }

    private fun stopInternalAudio() {
        internalAudioStop.set(true)
        internalAudioThread?.let { runCatching { it.join(3_000) } }
        internalAudioThread = null
        internalAudioRecorder = null
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

    private fun videoBitRate(width: Int, height: Int): Int {
        // 经验位率：约 0.12 bit/px/frame @30fps，取整到 Mbps 级（请求参数，非实测承诺）
        val bitsPerSecond = (width.toLong() * height * 30 * 0.12).toInt()
        return bitsPerSecond.coerceIn(2_000_000, 16_000_000)
    }

    private fun backfillWavHeader(wavFile: Path) {
        WavPacker.finalizeFile(
            wavFile,
            sampleRate = INTERNAL_AUDIO_SAMPLE_RATE,
            channels = 1,
            bitsPerSample = 16,
        )
    }

    companion object {
        private const val INTERNAL_AUDIO_SAMPLE_RATE = 44_100
    }
}
