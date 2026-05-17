plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    // Spring Boot Admin server 4.0.0 — UI dashboard quản trị 5 Spring service.
    // Pull theo BOM Boot 4 + Spring Cloud 2025.x.
    implementation(libs.spring.boot.admin.starter.server)

    // Eureka client: tự register vào discovery + đọc registry → auto-discover các Spring service.
    // Service nào có Eureka client + actuator endpoint sẽ tự hiện trong dashboard.
    implementation(libs.spring.cloud.starter.netflix.eureka.client)

    // Config client: kéo cấu hình env-specific từ config-server (chuẩn pattern toàn project).
    implementation(libs.spring.cloud.starter.config)

    // Tracing bridge — đồng nhất MDC traceId/spanId với 5 service còn lại.
    implementation(libs.micrometer.tracing.bridge.otel)

    testImplementation(libs.spring.boot.starter.test)
}
