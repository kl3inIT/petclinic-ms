// Convention plugin cho shared library module (vd: shared/common-web).
// KHÔNG phải Spring Boot app — không có bootJar. Chỉ produce plain JAR cho service consume.

plugins {
    id("petclinic.java-conventions")
    `java-library`                                        // adds `api` / `implementation` configurations
}

val libs = the<org.gradle.accessors.dm.LibrariesForLibs>()

dependencies {
    // Spring Boot BOM — native Gradle platform(), thay thế spring-dep-management plugin.
    // api() exports BOM constraints to consumers; annotationProcessor khai báo riêng vì
    // không kế thừa từ api/implementation.
    val bootBom = platform("org.springframework.boot:spring-boot-dependencies:${libs.versions.springBoot.get()}")
    api(bootBom)
    "annotationProcessor"(bootBom)
    "testImplementation"(bootBom)
    "testAnnotationProcessor"(bootBom)
}
