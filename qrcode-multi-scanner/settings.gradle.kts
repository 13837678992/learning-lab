pluginManagement {
    repositories {
        // 国内网络环境可把下面两行镜像仓库放到最前面以加速依赖下载
        // maven("https://maven.aliyun.com/repository/google")
        // maven("https://maven.aliyun.com/repository/public")
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        // maven("https://maven.aliyun.com/repository/google")
        // maven("https://maven.aliyun.com/repository/public")
        google()
        mavenCentral()
    }
}

rootProject.name = "qrcode-multi-scanner"
include(":app")
