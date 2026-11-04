plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

kotlin {
    jvmToolchain(17)
}

// 纯 JVM（阶段 7）：签名对象规范编码与**验证逻辑**放在 JVM 模块，
// 使独立验证器（阶段 10）无需 Android 运行时即可核验签名；
// 私钥的生成与使用（Android Keystore）由 app 层通过 SignatureEngine 接口注入。
dependencies {
    api(project(":core:model"))
    api(project(":core:integrity"))
    testImplementation(libs.junit)
}
