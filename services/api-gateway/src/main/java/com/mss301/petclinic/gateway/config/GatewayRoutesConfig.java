package com.mss301.petclinic.gateway.config;

import static com.mss301.petclinic.gateway.config.BulkheadFilterFunctions.bulkhead;
import static org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions.setPath;
import static org.springframework.cloud.gateway.server.mvc.filter.CircuitBreakerFilterFunctions.circuitBreaker;
import static org.springframework.cloud.gateway.server.mvc.filter.LoadBalancerFilterFunctions.lb;
import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;
import static org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions.http;
import static org.springframework.cloud.gateway.server.mvc.predicate.GatewayRequestPredicates.path;

import java.net.URI;
import java.time.Duration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

import io.github.resilience4j.bulkhead.BulkheadRegistry;

/**
 * Gateway routes — functional API (canonical pattern cho Spring Cloud Gateway 5.x WebMVC).
 *
 * <h4>Rate limit</h4>
 * Auth public endpoints (/login, /register, /refresh) bị rate-limit per-IP:
 * 10 req/phút. Chống brute-force credential stuffing + mass signup.
 *
 * <h4>Filter chain</h4>
 * <ol>
 *   <li>{@code rateLimit(...)} — per-IP token bucket (chỉ áp lên auth public routes)</li>
 *   <li>{@code lb("service")} — Spring Cloud LoadBalancer resolve qua Eureka</li>
 *   <li>{@code bulkhead(...)} — concurrency limit per downstream (fail-fast trước CB)</li>
 *   <li>{@code circuitBreaker(...)} — fallback nếu downstream lỗi</li>
 * </ol>
 *
 * <h4>Why bulkhead BEFORE circuit breaker?</h4>
 * Nếu CB trước: 1 burst 200 req → 200 inflight → 200 ăn CB call count → CB trip dù service OK.
 * Bulkhead trước: 200 burst → 195 reject ngay (503), 5 đi tiếp → CB chỉ thấy 5 call thực tế.
 * Tách 2 failure mode: "overload" vs "service hỏng".
 */
@Configuration
public class GatewayRoutesConfig {

    private static final URI FALLBACK_URI = URI.create("forward:/fallback");
    // Per-service CB ID — KHÔNG share. Trước đây dùng "defaultCircuitBreaker" cho tất cả routes,
    // khi 1 service trip CB (vd. /admin/llm/test với api-key chậm) → block toàn bộ routes khác
    // (chat, customers, vets...) trong 30s OPEN window. Per-service isolation đúng pattern.

    private final BulkheadRegistry bulkheadRegistry;

    public GatewayRoutesConfig(BulkheadRegistry bulkheadRegistry) {
        this.bulkheadRegistry = bulkheadRegistry;
    }

    @Bean
    public RouterFunction<ServerResponse> customersServiceRoute() {
        return route("customers-service")
                .route(path("/api/v1/owners/**")
                        .or(path("/api/v1/pets/**"))
                        .or(path("/api/v1/pet-types/**")), http())
                .filter(lb("customers-service"))
                .filter(bulkhead(bulkheadRegistry, "customersBulkhead"))
                .filter(circuitBreaker(c -> c.setId("customersCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> vetsServiceRoute() {
        return route("vets-service")
                .route(path("/api/v1/vets/**").or(path("/api/v1/specialties/**")), http())
                .filter(lb("vets-service"))
                .filter(bulkhead(bulkheadRegistry, "vetsBulkhead"))
                .filter(circuitBreaker(c -> c.setId("vetsCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> visitsServiceRoute() {
        return route("visits-service")
                .route(path("/api/v1/visits/**"), http())
                .filter(lb("visits-service"))
                .filter(bulkhead(bulkheadRegistry, "visitsBulkhead"))
                .filter(circuitBreaker(c -> c.setId("visitsCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    /**
     * Billing — hoá đơn gộp + danh mục bệnh. Consume visit.completed (async, không qua gateway).
     */
    @Bean
    public RouterFunction<ServerResponse> billingServiceRoute() {
        return route("billing-service")
                .route(path("/api/v1/invoices/**").or(path("/api/v1/diseases/**")), http())
                .filter(lb("billing-service"))
                .filter(bulkhead(bulkheadRegistry, "billingBulkhead"))
                .filter(circuitBreaker(c -> c.setId("billingCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    /**
     * Products — catalog thuốc/dịch vụ/vật tư + tồn kho. Consume bởi visits (lb://, không qua gateway).
     */
    @Bean
    public RouterFunction<ServerResponse> productsServiceRoute() {
        return route("products-service")
                .route(path("/api/v1/products/**"), http())
                .filter(lb("products-service"))
                .filter(bulkhead(bulkheadRegistry, "productsBulkhead"))
                .filter(circuitBreaker(c -> c.setId("productsCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> workflowServiceRoute() {
        return route("workflow-service")
                .route(path("/api/v1/workflows/**"), http())
                .filter(lb("workflow-service"))
                .filter(circuitBreaker(c -> c.setId("workflowCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    /**
     * AI chat — Phase 12b. JWT-protected ở downstream (genai-service security config).
     * CB scope rộng vì downstream call OpenRouter có thể chậm/lỗi không kiểm soát được.
     * Bulkhead SIẾT NHẤT: 5 concurrent — LLM call tốn $$$ + chậm + OpenRouter rate limit.
     */
    @Bean
    public RouterFunction<ServerResponse> genaiServiceRoute() {
        return route("genai-service")
                .route(path("/api/v1/ai/**").or(path("/api/v1/admin/llm/**")), http())
                .filter(lb("genai-service"))
                .filter(bulkhead(bulkheadRegistry, "genaiBulkhead"))
                .filter(circuitBreaker(c -> c.setId("genaiCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    /**
     * Auth PUBLIC endpoints — rate-limited per-IP (10 req/phút).
     * Chống brute-force (login), mass signup (register), refresh-spam.
     */
    @Bean
    public RouterFunction<ServerResponse> authPublicRoute() {
        PerIpRateLimit limiter = new PerIpRateLimit(10, Duration.ofMinutes(1));
        return route("auth-public")
                .route(path("/api/v1/auth/login")
                        .or(path("/api/v1/auth/register"))
                        .or(path("/api/v1/auth/refresh")), http())
                .filter(limiter.asFilter())
                .filter(lb("auth-service"))
                .filter(bulkhead(bulkheadRegistry, "authBulkhead"))
                .filter(circuitBreaker(cb -> cb.setId("authCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    /**
     * Auth PROTECTED endpoints — yêu cầu JWT (validate ở gateway + auth-service zero-trust).
     * Không rate-limit thêm (đã có chuẩn JWT-issued, ít abuse).
     */
    @Bean
    public RouterFunction<ServerResponse> authProtectedRoute() {
        return route("auth-protected")
                .route(path("/api/v1/auth/me").or(path("/api/v1/auth/logout")), http())
                .filter(lb("auth-service"))
                .filter(bulkhead(bulkheadRegistry, "authBulkhead"))
                .filter(circuitBreaker(cb -> cb.setId("authCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    /**
     * JWKS endpoint — public (clients lấy public key). Route qua gateway giúp services khác
     * (customers/vets) fetch dễ hơn nếu DNS chỉ vào gateway. Không rate-limit.
     */
    @Bean
    public RouterFunction<ServerResponse> jwksRoute() {
        return route("jwks")
                .route(path("/.well-known/jwks.json"), http())
                .filter(lb("auth-service"))
                .filter(circuitBreaker(cb -> cb.setId("authCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    // ─── OpenAPI aggregation ───────────────────────────────────────────────
    // Mỗi service expose spec ở /v3/api-docs. Gateway proxy theo tên dịch vụ
    // (/v3/api-docs/{service}) — Swagger UI dropdown chọn được, orval fetch
    // dễ. setPath() rewrite request thành /v3/api-docs trước khi forward.

    @Bean
    public RouterFunction<ServerResponse> apiDocsAuthRoute() {
        return route("api-docs-auth")
                .route(path("/v3/api-docs/auth"), http())
                .before(setPath("/v3/api-docs"))
                .filter(lb("auth-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> apiDocsCustomersRoute() {
        return route("api-docs-customers")
                .route(path("/v3/api-docs/customers"), http())
                .before(setPath("/v3/api-docs"))
                .filter(lb("customers-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> apiDocsVetsRoute() {
        return route("api-docs-vets")
                .route(path("/v3/api-docs/vets"), http())
                .before(setPath("/v3/api-docs"))
                .filter(lb("vets-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> apiDocsVisitsRoute() {
        return route("api-docs-visits")
                .route(path("/v3/api-docs/visits"), http())
                .before(setPath("/v3/api-docs"))
                .filter(lb("visits-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> apiDocsWorkflowRoute() {
        return route("api-docs-workflow")
                .route(path("/v3/api-docs/workflow"), http())
                .before(setPath("/v3/api-docs"))
                .filter(lb("workflow-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> apiDocsBillingRoute() {
        return route("api-docs-billing")
                .route(path("/v3/api-docs/billing"), http())
                .before(setPath("/v3/api-docs"))
                .filter(lb("billing-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> apiDocsProductsRoute() {
        return route("api-docs-products")
                .route(path("/v3/api-docs/products"), http())
                .before(setPath("/v3/api-docs"))
                .filter(lb("products-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> apiDocsGenaiRoute() {
        return route("api-docs-genai")
                .route(path("/v3/api-docs/genai"), http())
                .before(setPath("/v3/api-docs"))
                .filter(lb("genai-service"))
                .build();
    }
}
