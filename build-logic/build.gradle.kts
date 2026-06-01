

// build.gradle.kts của included build "build-logic".
// Khai báo dependency cho các convention plugin (file .gradle.kts trong src/main/kotlin).

plugins {
    // Cho phép viết Gradle plugin bằng Kotlin DSL trong src/main/kotlin/*.gradle.kts.
    `kotlin-dsl`
}

dependencies {
    implementation(libs.spring.boot.gradle.plugin)
    implementation(libs.spotless.gradle.plugin)

    // Hack đã được Gradle community công nhận: expose generated type-safe accessor
    // `org.gradle.accessors.dm.LibrariesForLibs` cho precompiled script plugins,
    // để convention plugin có thể `the<LibrariesForLibs>()` tham chiếu version catalog.
    // Khi Gradle có giải pháp built-in (issue #15383), dòng này sẽ được xoá.
    implementation(files(libs.javaClass.superclass.protectionDomain.codeSource.location))
}

// Spring Boot plugin runtime cần thiết để `extensions.configure<SpringBootExtension>` resolve type.
// spring-dep-management plugin đã bị loại bỏ — thay bằng Gradle native platform() BOM imports
// trong convention plugins (tương thích Gradle 9.5.x, không dùng internal ImmutableAttributes API).
