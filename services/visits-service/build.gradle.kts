plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    implementation(project(":shared:common-web"))
    implementation(project(":shared:common-jpa"))
    implementation(project(":shared:common-security"))      // JWT bearer auth
    implementation(project(":shared:common-clients"))       // service-to-service RestClient + JWT forward
    implementation(project(":shared:common-events"))        // publish visit.scheduled / visit.completed → mailer

    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.validation)
    implementation(libs.spring.boot.starter.liquibase)
    implementation(libs.springdoc.openapi.starter.webmvc.ui)
    implementation(libs.spring.cloud.starter.netflix.eureka.client)
    implementation(libs.spring.cloud.starter.config)

    // Service-to-service: load balancer (lb:// URI) + circuit breaker
    implementation("org.springframework.cloud:spring-cloud-starter-loadbalancer")
    implementation(libs.spring.cloud.starter.circuitbreaker.resilience4j)

    // Phase đơn thuốc — sinh PDF (OpenPDF 3.x, package org.openpdf.*)
    implementation(libs.openpdf)

    implementation(libs.micrometer.tracing.bridge.otel)
    runtimeOnly(libs.opentelemetry.exporter.otlp)
    runtimeOnly(libs.postgresql)

    developmentOnly(libs.spring.boot.docker.compose)

    testImplementation(libs.spring.boot.starter.test)
    testImplementation(libs.spring.boot.testcontainers)
    testImplementation(libs.testcontainers.postgresql)
    testImplementation(libs.testcontainers.junit.jupiter)
}
