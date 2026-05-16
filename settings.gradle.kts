rootProject.name = "petclinic-ms"

pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        mavenCentral()
    }
    // Version catalog (`gradle/libs.versions.toml`) tự động được Gradle pick up theo convention.
    // KHÔNG cần khai báo `versionCatalogs { … }` ở đây.
}

// Included build chứa convention plugin tự viết.
// Mọi `id("petclinic.xxx")` trong subproject đều resolve từ đây.
includeBuild("build-logic")

include(":shared:common-web")
include(":shared:common-jpa")
include(":services:discovery-server")
include(":services:config-server")
include(":services:customers-service")
include(":services:vets-service")
