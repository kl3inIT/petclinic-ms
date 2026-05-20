plugins {
    id("petclinic.spring-boot-service")
}

// Spring AI BOM — scoped tới genai-service (như mcp-server). KHÔNG kéo lên convention plugin.
dependencyManagement {
    imports {
        mavenBom("org.springframework.ai:spring-ai-bom:${libs.versions.springAi.get()}")
    }
}

// WebFlux stack — exclude Tomcat transitive (kéo từ spring-cloud-config/eureka client etc.)
// để khỏi conflict với Netty (Tomcat & Netty cùng có ReactiveManagementContextAutoConfiguration,
// Spring Boot 4 không cho cả 2 đồng thời).
configurations.all {
    exclude(group = "org.apache.tomcat.embed")
    exclude(group = "org.springframework.boot", module = "spring-boot-starter-tomcat")
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
    // Phase 12d — RAG via pgvector. Auto-config tạo PgVectorStore bean nếu spring.ai.vectorstore.*
    // có config; nếu skip → bean không create, RagConfig handle graceful.
    implementation(libs.spring.ai.starter.vector.store.pgvector)
    // QuestionAnswerAdvisor (Phase 12d) sống ở module tách riêng từ core
    // (spring-ai-client-chat KHÔNG kéo). Mới add ở 2.0.
    implementation(libs.spring.ai.advisors.vector.store)
    // MCP client: discover mcp-server qua Eureka, consume tools qua SyncMcpToolCallbackProvider
    implementation(libs.spring.ai.starter.mcp.client)

    // Standard Spring stack — WebFlux for true SSE streaming (bypass Spring MVC ReactiveTypeHandler aggregation)
    implementation(libs.spring.boot.starter.webflux)
    implementation(libs.spring.boot.starter.data.jpa)       // JdbcChatMemoryRepository cần JdbcTemplate; blocking JPA wrapped in boundedElastic
    implementation(libs.spring.boot.starter.validation)
    // Hibernate Validator cần Jakarta EL impl ở runtime (HV000183). Khi xài Tomcat,
    // Tomcat embed cung cấp; với Netty/WebFlux phải add riêng. Expressly = Jakarta EL 6.0 RI.
    // BOM Spring Boot 4.0 không manage version → pin explicit.
    runtimeOnly("org.glassfish.expressly:expressly:6.0.0")
    implementation(libs.spring.boot.starter.liquibase)
    implementation(libs.springdoc.openapi.starter.webflux.ui)
    implementation(libs.spring.cloud.starter.netflix.eureka.client)
    implementation(libs.spring.cloud.starter.config)
    implementation("org.springframework.cloud:spring-cloud-starter-loadbalancer")

    implementation(libs.micrometer.tracing.bridge.otel)
    runtimeOnly(libs.opentelemetry.exporter.otlp)
    runtimeOnly(libs.postgresql)

    developmentOnly(libs.spring.boot.docker.compose)

    // Shared test fixtures + WebFlux test annotation (genai-service WebFlux-only).
    testImplementation(project(":shared:common-testing"))
    testImplementation("org.springframework.boot:spring-boot-webflux-test")
}
