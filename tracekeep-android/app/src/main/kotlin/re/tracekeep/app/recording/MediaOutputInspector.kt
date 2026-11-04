package re.tracekeep.app.recording

import java.nio.file.Path
import re.tracekeep.core.recording.MediaInspector

/**
 * 用 `MediaMetadataRetriever` 在停止后读回实际媒体参数（音频与视频通用；需求 §3）。
 * 读不到的字段省略，绝不编造；整体失败抛异常由控制器记录 readable=false。
 *
 * 本类在纯 JVM 单元测试中不实例化（依赖 android.media.*），其行为依赖真机验证；
 * 参数读回的**失败路径**已在 RecordingControllerTest 中以 Fake 覆盖。
 */
class MediaOutputInspector : MediaInspector {

    override fun inspect(file: Path): Map<String, String> {
        val retriever = android.media.MediaMetadataRetriever()
        return try {
            retriever.setDataSource(file.toFile().absolutePath)
            buildMap {
                retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION)
                    ?.let { put("durationMs", it) }
                retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_MIMETYPE)
                    ?.let { put("mime", it) }
                retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_BITRATE)
                    ?.let { put("bitRateBps", it) }
                retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_SAMPLERATE)
                    ?.let { put("sampleRateHz", it) }
                retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_NUM_TRACKS)
                    ?.let { put("trackCount", it) }
                // 视频字段（音频文件读不到则自动省略）
                retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
                    ?.let { put("videoWidth", it) }
                retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
                    ?.let { put("videoHeight", it) }
                retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_VIDEO_FRAME_COUNT)
                    ?.let { put("videoFrameCount", it) }
                retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_CAPTURE_FRAMERATE)
                    ?.let { put("captureFrameRate", it) }
                retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO)
                    ?.let { put("hasAudio", it) }
            }
        } finally {
            runCatching { retriever.release() }
        }
    }
}
