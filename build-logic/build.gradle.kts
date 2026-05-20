// build.gradle.kts của included build "build-logic".
// Khai báo dependency cho các convention plugin (file .gradle.kts trong src/main/kotlin).

plugins {
    // Cho phép viết Gradle plugin bằng Kotlin.
    `kotlin-dsl`
    `java-gradle-plugin`
}

dependencies {
    implementation(libs.spring.boot.gradle.plugin)
    implementation(libs.spring.dep.management.plugin)
    implementation(libs.spotless.gradle.plugin)

    // Hack đã được Gradle community công nhận: expose generated type-safe accessor
    // `org.gradle.accessors.dm.LibrariesForLibs` cho precompiled script plugins,
    // để convention plugin có thể `the<LibrariesForLibs>()` tham chiếu version catalog.
    // Khi Gradle có giải pháp built-in (issue #15383), dòng này sẽ được xoá.
    implementation(files(libs.javaClass.superclass.protectionDomain.codeSource.location))
}

// Gradle 9 quirk: precompiled script plugin compile classpath cần Spring Boot plugin runtime
// để `extensions.configure<SpringBootExtension>` resolve được type SpringBootExtension.
// `implementation(libs.spring.boot.gradle.plugin)` ở trên đã đủ — không cần thêm gì.

gradlePlugin {
    plugins {
        create("javaConventions") {
            id = "petclinic.java-conventions"
            implementationClass = "com.mss301.petclinic.buildlogic.JavaConventionsPlugin"
        }
        create("springBootService") {
            id = "petclinic.spring-boot-service"
            implementationClass = "com.mss301.petclinic.buildlogic.SpringBootServicePlugin"
        }
        create("sharedLibrary") {
            id = "petclinic.shared-library"
            implementationClass = "com.mss301.petclinic.buildlogic.SharedLibraryPlugin"
        }
    }
}
