plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

kotlin {
    jvmToolchain(17)
}

// 纯 JVM（阶段 7）：规范编码与哈希链实现必须与 Android 框架无关，
// 以便独立验证器（阶段 10）复用同一字节级实现。
dependencies {
    api(project(":core:model"))
    testImplementation(libs.junit)
}
