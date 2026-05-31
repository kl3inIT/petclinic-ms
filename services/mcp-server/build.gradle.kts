plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    // Spring AI BOM — native Gradle platform(). Scope: chỉ mcp-server + genai-service.
    implementation(platform(libs.spring.ai.bom))
    // MCP server (Model Context Protocol) — expose @Tool methods qua STREAMABLE HTTP transport.
    // WebMVC variant match stack toàn project (blocking + virtual threads), KHÔNG dùng WebFlux variant.
    implementation(libs.spring.ai.starter.mcp.server.webmvc)

    // Eureka client để Spring services khác (genai-service Phase 12b) discover mcp-server qua lb://.
    implementation(libs.spring.cloud.starter.netflix.eureka.client)
    implementation(libs.spring.cloud.starter.config)

    // Web (RestClient) — gọi customers-service / vets-service / visits-service qua Eureka LB.
    implementation(libs.spring.boot.starter.web)
    // common-clients ship @LoadBalanced RestClient.Builder + JwtForwardInterceptor → reuse.
    implementation(project(":shared:common-clients"))
    implementation(project(":shared:common-web"))
    // MCP spec 2025-11-25: MCP server = OAuth 2.1 Resource Server. JWT bearer + JWKS từ
    // auth-service. common-security cung cấp JwtDecoder + JwtAuthenticationConverter.
    // McpServer-specific SecurityFilterChain override default chain ở common-security.
    implementation(project(":shared:common-security"))

    // Tracing — span của tool call sẽ link với gateway → visits → customers traces.
    implementation(libs.micrometer.tracing.bridge.otel)
    runtimeOnly(libs.opentelemetry.exporter.otlp)

    testImplementation(libs.spring.boot.starter.test)
}
