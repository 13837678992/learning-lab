plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

kotlin {
    jvmToolchain(17)
}

// 纯 JVM 模块（D-014）：存储逻辑只使用 java.io/java.nio 文件操作，
// Android 层仅传入应用私有目录（filesDir）。好处：单元测试无需模拟器/真机，
// 且独立验证工具（阶段 10）可以直接复用同一字节级格式实现。
dependencies {
    api(project(":core:model"))
    implementation(project(":core:integrity"))
    implementation(project(":core:location"))
    implementation(project(":core:crypto"))
    testImplementation(libs.junit)
}
