plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
    application
}

kotlin {
    jvmToolchain(17)
}

application {
    mainClass.set("re.tracekeep.core.verify.cli.MainKt")
}

// 独立离线验证工具（需求 §6；阶段 10）：
// - 纯 JVM、可 `./gradlew :core:verify:run --args="<包目录>"` 或打包为可执行 jar 离线运行；
// - 不依赖 Android、原 App 数据库、私钥或网络；
// - 输入为证据包目录（阶段 9 导出）。
dependencies {
    implementation(project(":core:model"))
    implementation(project(":core:integrity"))
    implementation(project(":core:crypto"))
    testImplementation(libs.junit)
}
