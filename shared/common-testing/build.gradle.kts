plugins {
    id("petclinic.shared-library")
}

// Common test infrastructure — base classes + utilities cho mọi service test.
// Service consume qua: testImplementation(project(":shared:common-testing"))
//
// `api` exposes deps lên test classpath của service (không cần redeclare).
// Đây là module TEST, nhưng compile như library bình thường để main code service
// có thể reference (vd: service tự viết test util kế thừa).
dependencies {
    // ─ Core test stack — Boot 4 Spring Test + JUnit 5 + AssertJ + Mockito đã sẵn trong starter-test
    api("org.springframework.boot:spring-boot-starter-test")

    // ─ Boot 4 module split — slice test annotations chuyển sang module riêng:
    //   spring-boot-webmvc-test → @WebMvcTest, @AutoConfigureMockMvc (servlet stack)
    //   spring-boot-webflux-test → @WebFluxTest (reactive — chỉ genai-service cần, KHÔNG đưa vào api
    //     vì sẽ kéo spring-webflux vào test classpath của service servlet → conflict servlet/reactive
    //     context detection ở @WebMvcTest).
    //   spring-boot-jpa-test    → @DataJpaTest (slice JPA — opt-in per service, không default)
    // Trước (Boot 3): nằm chung trong spring-boot-test-autoconfigure.
    api("org.springframework.boot:spring-boot-webmvc-test")

    // ─ Security test — @WithMockUser, mock JWT, mock Authentication
    api("org.springframework.security:spring-security-test")
    // OAuth2 resource server — Jwt, JwtAuthenticationToken types cho test helper
    api("org.springframework.boot:spring-boot-starter-oauth2-resource-server")

    // ─ Reactor test — StepVerifier cho Flux/Mono assertion
    api("io.projectreactor:reactor-test")

    // ─ Testcontainers — Postgres + JUnit 5 integration
    api("org.springframework.boot:spring-boot-testcontainers")
    api("org.testcontainers:testcontainers-postgresql")
    api("org.testcontainers:testcontainers-junit-jupiter")

    // Implementation-only — common-testing tự dùng nhưng KHÔNG ép service
    implementation("org.springframework:spring-context")
}
