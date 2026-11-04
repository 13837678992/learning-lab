pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "tracekeep-android"

include(":app")
include(":core:model")
include(":core:storage")
include(":core:integrity")
include(":core:crypto")
include(":core:location")
include(":core:timestamp")
include(":core:provider")
include(":core:export")
include(":core:verify")
include(":core:recording")
