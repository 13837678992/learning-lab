package re.tracekeep.core.recording

import java.nio.file.Path

/**
 * 录音配置（请求参数）。
 * 注意语义（需求 §3）：这里是**请求的**编码参数；设备可能实际采用不同参数。
 * 事件日志中记录时标注 requested=true，不得把请求参数冒充为实测参数（实测值由 [MediaInspector] 读回）。
 */
data class AudioRecordingConfig(
    val codec: String,
    val container: String,
    val sampleRateHz: Int,
    val channelCount: Int,
    val bitRateBps: Int,
    val fileExtension: String = "m4a",
    /** 是否随会话记录定位（用户开关；实际采样由 app 层 LocationSampler 执行）。 */
    val locationEnabled: Boolean = false,
)

/** 视频录制配置（请求参数；实际输出参数由 MediaInspector 读回）。 */
data class VideoRecordingConfig(
    val targetQuality: String,
    val audioEnabled: Boolean,
    /** 初始摄像头朝向："back"（默认）或 "front"。 */
    val cameraFacing: String = "back",
    val fileExtension: String = "mp4",
    /** 是否启用视频水印（时间/位置/编号叠加进最终视频帧；由 app 层 OverlayEffect 实现）。 */
    val watermarkEnabled: Boolean = false,
    /** 水印时间显示所用时区（设备当前时区；显式记录以保证可复核）。 */
    val watermarkTimeZoneId: String = "SYSTEM",
    /** 是否随会话记录定位（用户开关；水印的位置行同样取决于实际定位结果）。 */
    val locationEnabled: Boolean = false,
)

/** 屏幕录制的音频来源（需求 §3 录屏：分别处理麦克风与内部音频）。 */
enum class ScreenAudioSource {
    /** 无音频。 */
    NONE,

    /** 麦克风（与录音相同的运行时权限）。 */
    MICROPHONE,

    /** 内部音频（应用播放声音捕获；需 Android 10 / API 29+，低版本如实标记不支持）。 */
    INTERNAL,
}

/** 屏幕录制配置（请求参数）。 */
data class ScreenRecordingConfig(
    val audioSource: ScreenAudioSource = ScreenAudioSource.MICROPHONE,
    val targetQuality: String = "FHD",
    val fileExtension: String = "mp4",
    /** 是否随会话记录定位（用户开关）。 */
    val locationEnabled: Boolean = false,
)

/** 引擎动作结果。Failure 的 [reason] 是给事件日志与用户的事实描述，不得写入推测性内容。 */
sealed interface EngineResult {
    data object Ok : EngineResult
    data class Failure(val reason: String) : EngineResult
}

/**
 * 通用录制引擎接口（录音/录像/录屏共用；Android 实现由 app 层注入，测试用 Fake）。
 *
 * 契约：
 * - [outputFileNames]：引擎本次会话需要的**输出文件名清单**（第一个为主输出）。
 *   控制器据此为每个文件在存储层登记 ORIGINAL 记录，并把「文件名 → 已创建的绝对路径」
 *   通过 [start] 传入。多输出场景（如录屏的内部音频轨）由引擎自行声明，例如
 *   `["media.mp4", "internal-audio.wav"]`——两条输出都作为独立原始件被登记与保全。
 * - [start] 成功后引擎向给定路径写入（所有路径在调用前已由存储层创建）；
 * - [stop] 必须**在容器/文件封装完成之后**才返回 Ok（需求 §3：封装完成后再计算最终哈希）；
 * - [abort] 尽力释放资源；不得删除或改写任何目标文件（存储层负责如实标记未完成）；
 * - 不支持的动作（如录音引擎无摄像头、相机未就绪）**返回 Failure 而不是抛出**
 *   （默认实现即如此），由控制器如实记录；
 * - 异步错误（录制中途设备中断等）由 app 层转交 [RecordingController.onEngineError]。
 */
interface RecordingEngine {
    /** 本次会话的输出文件名清单（第一个为主输出；名称必须是安全文件名）。 */
    fun outputFileNames(): List<String>

    /** 开始录制；[outputFiles] 键为 [outputFileNames] 中的名称，值为已创建的绝对路径。 */
    fun start(outputFiles: Map<String, Path>): EngineResult

    fun stop(): EngineResult

    fun abort()

    fun pause(): EngineResult = EngineResult.Failure("pause not supported by this engine")

    fun resume(): EngineResult = EngineResult.Failure("resume not supported by this engine")

    /** 切换前后摄像头（仅摄像机引擎有实际实现；不支持时返回 Failure）。 */
    fun switchCamera(): EngineResult = EngineResult.Failure("camera switch not supported by this engine")

    /** 当前摄像头朝向（"back"/"front"；供 [RecordingController.switchCamera] 记录事件）。 */
    fun currentCameraFacing(): String = "back"

    /**
     * 水印已绘制进输出帧的计数（仅录像引擎有意义）。
     * 返回 null 表示该引擎无水分能力（如录音引擎）——事件中不出现该字段；
     * 返回 0 表示配置了水印但一帧未绘制（失败），报告必须如实披露。
     */
    fun watermarkFramesDrawn(): Long? = null
}
