package re.tracekeep.core.model

/** 会话录制类型（需求 §3：三种录制方式分别记录，不得混淆）。 */
enum class RecordingType {
    AUDIO,
    CAMERA_VIDEO,
    SCREEN,
}
