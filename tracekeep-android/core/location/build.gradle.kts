plugins {
    alias(libs.plugins.kotlin.jvm)
}

kotlin {
    jvmToolchain(17)
}

// 纯 JVM 模块（D-027）：时间源一致性检测只依赖两个 long 读数与纯算法，
// 不依赖 Android 框架——可 JVM 单测，且独立验证器（阶段 10）可复用同一判定逻辑。
dependencies {
    api(project(":core:model"))
    testImplementation(libs.junit)
}
