plugins {
    id("petclinic.spring-boot-service")
}

// Spring AI BOM — scoped tới genai-service (như mcp-server). KHÔNG kéo lên convention plugin.
dependencyManagement {
    imports {
        mavenBom("org.springframework.ai:spring-ai-bom:${libs.versions.springAi.get()}")
    }
}

dependencies {
    implementation(project(":shared:common-web"))
    implementation(project(":shared:common-jpa"))
    implementation(project(":shared:common-security"))      // JWT bearer auth — chat endpoint cần ROLE_USER

    // Spring AI starter — kéo `spring-ai-openai` + `spring-ai-client-chat` (ChatClient)
    // + autoconfig. Auto-config bean bị tắt qua `spring.ai.model.chat=none` (gotcha #33);
    // mình tự build OpenAiChatModel trong ChatClientConfig để override baseUrl/apiKey runtime.
    implementation(libs.spring.ai.starter.model.openai)
    // Chat memory persistence — Postgres backed JdbcChatMemoryRepository.
    implementation(libs.spring.ai.starter.model.chat.memory.repository.jdbc)
    // MCP client: discover mcp-server qua Eureka, consume tools qua SyncMcpToolCallbackProvider
    implementation(libs.spring.ai.starter.mcp.client)

    // Standard Spring stack
    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.data.jpa)       // JdbcChatMemoryRepository cần JdbcTemplate
    implementation(libs.spring.boot.starter.validation)
    implementation(libs.spring.boot.starter.liquibase)
    implementation(libs.springdoc.openapi.starter.webmvc.ui)
    implementation(libs.spring.cloud.starter.netflix.eureka.client)
    implementation(libs.spring.cloud.starter.config)
    implementation("org.springframework.cloud:spring-cloud-starter-loadbalancer")

    implementation(libs.micrometer.tracing.bridge.otel)
    runtimeOnly(libs.opentelemetry.exporter.otlp)
    runtimeOnly(libs.postgresql)

    developmentOnly(libs.spring.boot.docker.compose)

    testImplementation(libs.spring.boot.starter.test)
    testImplementation(libs.spring.boot.testcontainers)
    testImplementation(libs.testcontainers.postgresql)
    testImplementation(libs.testcontainers.junit.jupiter)
}
