// Convention plugin #2: Spring Boot service.
// Áp lên mỗi service Spring Boot (customers, vets, visits...) — kéo theo Java conventions
// và Spring Boot plugin + dependency-management + Spring Cloud BOM.

import org.springframework.boot.gradle.dsl.SpringBootExtension
import org.springframework.boot.gradle.tasks.run.BootRun

plugins {
    id("petclinic.java-conventions")
    id("org.springframework.boot")
}

val libs = the<org.gradle.accessors.dm.LibrariesForLibs>()

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
    // BOMs — native Gradle platform(), thay thế spring-dep-management plugin.
    // Boot 4 plugin KHÔNG tự-inject BOM. Cần khai báo tường minh trên mọi config
    // vì platform() chỉ cover config extends từ nơi khai báo; annotationProcessor /
    // developmentOnly / testImplementation là các config riêng không kế thừa implementation.
    val bootBom = platform("org.springframework.boot:spring-boot-dependencies:${libs.versions.springBoot.get()}")
    val cloudBom = platform("org.springframework.cloud:spring-cloud-dependencies:${libs.versions.springCloud.get()}")
    "implementation"(bootBom)
    "implementation"(cloudBom)
    "annotationProcessor"(bootBom)
    "testImplementation"(bootBom)
    "testImplementation"(cloudBom)
    "testAnnotationProcessor"(bootBom)
    "developmentOnly"(bootBom)
    "implementation"(libs.spring.boot.starter.actuator)
    // Mọi service ship metrics dạng Prometheus exposition format qua /actuator/prometheus.
    // Endpoint chỉ visible khi registry có trên classpath → để ở runtime cũng được, nhưng
    // implementation giữ compile-time visibility nếu service muốn custom Tags/MeterFilter.
    "runtimeOnly"(libs.micrometer.registry.prometheus)
}
