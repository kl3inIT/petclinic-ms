// Convention plugin #1: Java baseline.
// Mọi module áp dụng plugin này sẽ có: Java 25 toolchain, UTF-8, JUnit 5, JaCoCo coverage, Spotless lint.

plugins {
    java
    jacoco
    id("com.diffplug.spotless")
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
        "-Xlint:all,-processing",                   // surface ALL compiler warnings (skip annotation processing noise)
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

// ────────────────────────────────────────────────────────────────────────────
// Spotless: enforce hygiene cơ bản, KHÔNG reformat code body.
// - trimTrailingWhitespace: xoá space cuối dòng (lý do thật cho 1/3 PR diff bẩn).
// - endWithNewline: file Java/yaml/md kết thúc bằng newline (POSIX, git diff sạch).
// - removeUnusedImports: imports không dùng → xoá (giảm noise + class-loader warnings).
// - importOrder: java → javax → jakarta → org → com → '' (rest), tạo thứ tự deterministic.
//
// KHÔNG dùng googleJavaFormat / palantirJavaFormat — vì sẽ reformat method bodies/braces/wrap,
// tạo PR "format everything" lớn phá git blame. Decision: keep existing code style, only guard hygiene.
// ────────────────────────────────────────────────────────────────────────────
spotless {
    java {
        target("src/**/*.java")
        trimTrailingWhitespace()
        endWithNewline()
        removeUnusedImports()
        importOrder("java", "javax", "jakarta", "org", "com", "")
        // tabsToSpaces 4 không bật — code đã uniform 4-space, bật sẽ no-op nhưng touch checksum.
    }
    kotlinGradle {
        target("*.gradle.kts", "src/**/*.gradle.kts")
        trimTrailingWhitespace()
        endWithNewline()
    }
    format("misc") {
        target("*.md", "*.yml", "*.yaml", ".gitignore")
        trimTrailingWhitespace()
        endWithNewline()
    }
}
