// TraceKeep（证迹）根构建脚本。
// 版本统一固定在 gradle/libs.versions.toml；不得在此处使用动态版本（+ / latest）。
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}
