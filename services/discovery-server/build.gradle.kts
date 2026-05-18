plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    // Eureka Server kéo theo spring-boot-starter-web + jersey transitively.
    // KHÔNG cần data-jpa / liquibase / postgres — discovery không có persistence.
    implementation(libs.spring.cloud.starter.netflix.eureka.server)
    implementation(libs.micrometer.tracing.bridge.otel)
    runtimeOnly(libs.opentelemetry.exporter.otlp)

    testImplementation(libs.spring.boot.starter.test)
}
