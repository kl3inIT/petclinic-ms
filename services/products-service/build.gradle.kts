plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    implementation(project(":shared:common-web"))
    implementation(project(":shared:common-jpa"))
    implementation(project(":shared:common-security"))      // JWT bearer auth

    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.validation)
    implementation(libs.spring.boot.starter.liquibase)
    implementation(libs.springdoc.openapi.starter.webmvc.ui)
    implementation(libs.spring.cloud.starter.netflix.eureka.client)
    implementation(libs.spring.cloud.starter.config)

    implementation(libs.micrometer.tracing.bridge.otel)
    runtimeOnly(libs.opentelemetry.exporter.otlp)
    runtimeOnly(libs.postgresql)

    developmentOnly(libs.spring.boot.docker.compose)

    testImplementation(project(":shared:common-testing"))
    testImplementation(libs.spring.boot.starter.test)
    testImplementation(libs.spring.boot.testcontainers)
    testImplementation(libs.testcontainers.postgresql)
    testImplementation(libs.testcontainers.junit.jupiter)
}
