// Convention plugin cho shared library module (vd: shared/common-web).
// KHÔNG phải Spring Boot app — không có bootJar. Chỉ produce plain JAR cho service consume.

plugins {
    id("petclinic.java-conventions")
    `java-library`                                        // adds `api` / `implementation` configurations
    id("io.spring.dependency-management")                 // import Spring Boot BOM cho version resolution
}

val libs = the<org.gradle.accessors.dm.LibrariesForLibs>()

dependencyManagement {
    imports {
        mavenBom("org.springframework.boot:spring-boot-dependencies:${libs.versions.springBoot.get()}")
    }
}
