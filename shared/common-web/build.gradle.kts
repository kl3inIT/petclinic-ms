plugins {
    id("petclinic.shared-library")
}

dependencies {
    // `api` exposes lên classpath cho service consume (ProblemDetail, ResponseEntity)
    api("org.springframework:spring-web")

    // `compileOnly` — service phải tự bring runtime, library KHÔNG force pin version
    compileOnly("org.springframework.boot:spring-boot-autoconfigure")
    compileOnly("org.springframework:spring-webmvc")
    compileOnly("org.springframework:spring-tx")              // ConcurrencyFailureException
    // springdoc starter (version 3.0.3 từ libs catalog) — kéo theo swagger-annotations transitively
    compileOnly(libs.springdoc.openapi.starter.webmvc.ui)

    // Generate META-INF/spring-autoconfigure-metadata.properties → tăng tốc auto-config scan
    annotationProcessor("org.springframework.boot:spring-boot-autoconfigure-processor")
}
