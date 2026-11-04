plugins {
    alias(libs.plugins.kotlin.jvm)
}

kotlin {
    jvmToolchain(17)
}

// 纯 JVM 录制编排模块（D-016）：会话接线/文件登记/异常处置逻辑与 Android 框架解耦，
// 实际录音引擎由 app 层通过 AudioRecorderEngine 接口注入。
dependencies {
    api(project(":core:model"))
    api(project(":core:storage"))
    testImplementation(libs.junit)
}
