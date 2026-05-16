plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    // Gateway MVC variant — Spring MVC functional routing, blocking, runs on Java 25 virtual threads.
    implementation(libs.spring.cloud.starter.gateway.server.webmvc)

    // Eureka client để gateway tự register + load-balanced `lb://` URI scheme resolve service name.
    implementation(libs.spring.cloud.starter.netflix.eureka.client)
    implementation(libs.spring.cloud.starter.config)

    // CircuitBreaker — servlet variant (KHÔNG dùng reactor variant vì gateway ở stack MVC).
    implementation(libs.spring.cloud.starter.circuitbreaker.resilience4j)

    // Shared ProblemDetail format cho /fallback consistency với services khác.
    implementation(project(":shared:common-web"))
    implementation(project(":shared:common-security"))      // Iter 2: validate JWT trước khi forward
    implementation(libs.spring.boot.starter.web)

    implementation(libs.micrometer.tracing.bridge.otel)

    testImplementation(libs.spring.boot.starter.test)
}
