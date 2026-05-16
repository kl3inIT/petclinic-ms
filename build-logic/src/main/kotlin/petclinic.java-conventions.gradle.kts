// Convention plugin #1: Java baseline.
// Mọi module áp dụng plugin này sẽ có: Java 25 toolchain, UTF-8, JUnit 5, JaCoCo coverage.

plugins {
    java
    jacoco
}

// Đọc version catalog ở scope của precompiled script plugin (Gradle 9 syntax).
val libs = the<org.gradle.accessors.dm.LibrariesForLibs>()

group = "com.mss301.petclinic"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(libs.versions.java.get().toInt()))
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf(
        "-parameters",                              // cần cho Spring lấy tên tham số (DI, @PathVariable…)
        "-Xlint:unchecked,deprecation,rawtypes",    // surface warnings — fail-fast trên code smells
    ))
}

dependencies {
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
    }
    // JaCoCo: tự collect coverage data khi test chạy.
    finalizedBy(tasks.named("jacocoTestReport"))
}

// JaCoCo report — HTML + XML cho SonarQube/CI integration sau này.
tasks.named<JacocoReport>("jacocoTestReport") {
    dependsOn(tasks.named("test"))
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}
