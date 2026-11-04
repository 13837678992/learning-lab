plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

kotlin {
    jvmToolchain(17)
}

// 纯 JVM（需求 §7；阶段 8）：第三方时间戳能力的**接口层**——
// 供应商实现（联网）由 app 层注入；接口与「未存证」语义在纯 JVM 可测。
// 硬性纪律：未核实服务主体/条款/接口/价格之前，不实现也不引用任何具体供应商（D-003）。
dependencies {
    api(project(":core:model"))
    testImplementation(libs.junit)
}
