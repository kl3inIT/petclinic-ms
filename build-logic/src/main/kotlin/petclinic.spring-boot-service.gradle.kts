// Convention plugin #2: Spring Boot service.
// Áp lên mỗi service Spring Boot (customers, vets, visits...) — kéo theo Java conventions
// và Spring Boot plugin + dependency-management + Spring Cloud BOM.

import org.springframework.boot.gradle.dsl.SpringBootExtension
import org.springframework.boot.gradle.tasks.run.BootRun

plugins {
    id("petclinic.java-conventions")
    id("org.springframework.boot")
    id("io.spring.dependency-management")
}

val libs = the<org.gradle.accessors.dm.LibrariesForLibs>()

dependencyManagement {
    imports {
        // Spring Cloud BOM — quản lý version của mọi spring-cloud-* mà service kéo về.
        mavenBom("org.springframework.cloud:spring-cloud-dependencies:${libs.versions.springCloud.get()}")
    }
}

// Sinh `META-INF/build-info.properties` — Actuator /info hiện build version, time, group, artifact.
extensions.configure<SpringBootExtension> {
    buildInfo {
        properties {
            additional.set(mapOf(
                "service" to project.name,
            ))
        }
    }
}

// bootRun chạy từ root project — để Spring Boot Docker Compose tìm `compose.yaml` ở đúng chỗ.
tasks.named<BootRun>("bootRun") {
    workingDir = project.rootDir
}

dependencies {
    "implementation"(libs.spring.boot.starter.actuator)
    // Mọi service ship metrics dạng Prometheus exposition format qua /actuator/prometheus.
    // Endpoint chỉ visible khi registry có trên classpath → để ở runtime cũng được, nhưng
    // implementation giữ compile-time visibility nếu service muốn custom Tags/MeterFilter.
    "runtimeOnly"(libs.micrometer.registry.prometheus)
}
