plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    implementation(project(":shared:common-web"))
    implementation(project(":shared:common-jpa"))
    implementation(project(":shared:common-security"))      // Iter 2: JWT bearer auth + zero-trust validation
    implementation(project(":shared:common-events"))        // publish owner/pet domain events → mailer + analytics
    implementation(project(":shared:common-storage"))       // MinIO storage — pet photo + owner avatar (dùng chung pattern với vets)
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

    // bootRun trong dev tự start/stop container theo compose.yaml.
    // KHÔNG kích hoạt lúc package/prod build — chỉ developmentOnly.
    developmentOnly(libs.spring.boot.docker.compose)

    // Shared test fixtures: AbstractPostgresIntegrationTest + JwtTestSupport + Spring test stack.
    // common-testing api-exposes starter-test + testcontainers + security-test → không cần redeclare.
    testImplementation(project(":shared:common-testing"))
    testImplementation(libs.testcontainers.minio)           // IT cho upload ảnh pet/owner
}
