// Root build script — KHÔNG có code, KHÔNG apply plugin nào trực tiếp.
// Mọi convention chuyển sang build-logic/.

plugins {
    jacoco
}

group = "com.mss301.petclinic"
version = "0.0.1-SNAPSHOT"

// ────────────────────────────────────────────────────────────────────────────
// Aggregate JaCoCo report — union execution data + source/class từ mọi subproject
// có jacoco plugin (= mọi service/shared module áp petclinic.java-conventions).
//
// KHÔNG dùng `jacoco-report-aggregation` plugin vì nó resolve transitive deps
// trên root project, conflict với Spring BOM (BOM được apply ở từng subproject
// qua dependencyManagement scope). Manual JacocoReport task chỉ cần
// executionData/sourceDirectories/classDirectories — không touch resolution graph.
//
// Output: build/reports/jacoco/jacocoAggregatedReport/jacocoAggregatedReport.xml (cho Codecov/Sonar)
// ────────────────────────────────────────────────────────────────────────────
tasks.register<JacocoReport>("jacocoAggregatedReport") {
    group = "verification"
    description = "Aggregate JaCoCo coverage across all subprojects into one XML+HTML report."

    val javaSubs = subprojects.filter { it.plugins.hasPlugin("java") || it.subprojects.isNotEmpty() }
        .flatMap { listOf(it) + it.subprojects }
        .filter { it.plugins.findPlugin("java") != null }

    dependsOn(javaSubs.map { "${it.path}:test" })

    executionData.setFrom(
        javaSubs.flatMap {
            fileTree(it.layout.buildDirectory.dir("jacoco")).matching { include("**/*.exec") }
        }
    )
    sourceDirectories.setFrom(
        javaSubs.flatMap { listOf(it.layout.projectDirectory.dir("src/main/java")) }
    )
    classDirectories.setFrom(
        javaSubs.flatMap { listOf(it.layout.buildDirectory.dir("classes/java/main")) }
    )

    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}

// Task tiện ích: ./gradlew clean ở root sẽ clean tất cả subproject.
tasks.register<Delete>("cleanAll") {
    group = "build"
    description = "Delete build directories of root and all subprojects."
    delete(rootProject.layout.buildDirectory)
    subprojects.forEach { delete(it.layout.buildDirectory) }
}
