// build-logic là một INCLUDED BUILD độc lập với root.
// Phải tự khai báo repositories và import lại version catalog từ root.

rootProject.name = "build-logic"

dependencyResolutionManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
    versionCatalogs {
        create("libs") {
            from(files("../gradle/libs.versions.toml"))
        }
    }
}
