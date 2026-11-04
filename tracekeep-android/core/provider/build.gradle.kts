plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

kotlin {
    jvmToolchain(17)
}

// 纯 JVM（需求 §7；阶段 8）：第三方电子数据存证 / 本地签名提供者接口层。
// 纪律同 core:timestamp：未核实供应商前不实现适配器、不硬编码 API、不虚构回执（D-003）。
dependencies {
    api(project(":core:model"))
    testImplementation(libs.junit)
}
