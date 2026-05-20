plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    implementation(project(":shared:common-web"))
    implementation(project(":shared:common-jpa"))
    implementation(project(":shared:common-security"))      // Iter 2
    implementation(project(":shared:common-events"))        // Phase G — publish vet.rating.added
    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.validation)
    implementation(libs.spring.boot.starter.liquibase)
    implementation(libs.springdoc.openapi.starter.webmvc.ui)
    implementation(libs.spring.cloud.starter.netflix.eureka.client)
    implementation(libs.spring.cloud.starter.config)
    implementation(libs.micrometer.tracing.bridge.otel)
    // Phase E2 — S3-compatible storage (MinIO local dev, AWS S3 prod). aws-sdk-s3
    // kéo theo `s3-presigner` cùng SDK, không cần khai báo riêng.
    implementation(libs.aws.sdk.s3)
    runtimeOnly(libs.opentelemetry.exporter.otlp)
    runtimeOnly(libs.postgresql)

    developmentOnly(libs.spring.boot.docker.compose)

    testImplementation(libs.spring.boot.starter.test)
    testImplementation(libs.spring.boot.testcontainers)
    testImplementation(libs.testcontainers.postgresql)
    testImplementation(libs.testcontainers.junit.jupiter)
    testImplementation(libs.testcontainers.minio)
    testImplementation(libs.spring.security.test)
}
