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
include(":shared:common-security")
include(":shared:common-clients")
include(":shared:common-events")
include(":shared:common-storage")
include(":shared:common-testing")
include(":services:discovery-server")
include(":services:config-server")
include(":services:api-gateway")
include(":services:auth-service")
include(":services:customers-service")
include(":services:vets-service")
include(":services:visits-service")
include(":services:workflow-service")
include(":services:admin-server")
include(":services:mcp-server")
include(":services:genai-service")
include(":services:reviews-service")
include(":services:billing-service")
include(":services:products-service")
