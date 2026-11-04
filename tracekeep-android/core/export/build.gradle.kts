plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

kotlin {
    jvmToolchain(17)
}

// 纯 JVM（阶段 9）：证据包打包、manifest 生成与导出后复核不含 Android 依赖，
// 便于独立验证器（阶段 10）复用同一包格式；PDF 渲染细节由 app 层的 PdfRenderer 注入。
dependencies {
    api(project(":core:model"))
    implementation(project(":core:integrity"))
    implementation(project(":core:crypto"))
    implementation(project(":core:verify"))
    implementation(project(":core:provider"))
    testImplementation(libs.junit)
}
