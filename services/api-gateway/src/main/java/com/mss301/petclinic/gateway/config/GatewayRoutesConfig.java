package com.mss301.petclinic.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

import java.net.URI;
import java.time.Duration;

import static org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions.setPath;
import static org.springframework.cloud.gateway.server.mvc.filter.CircuitBreakerFilterFunctions.circuitBreaker;
import static org.springframework.cloud.gateway.server.mvc.filter.LoadBalancerFilterFunctions.lb;
import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;
import static org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions.http;
import static org.springframework.cloud.gateway.server.mvc.predicate.GatewayRequestPredicates.path;

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
 *   <li>{@code circuitBreaker(...)} — fallback nếu downstream lỗi</li>
 * </ol>
 */
@Configuration
public class GatewayRoutesConfig {

    private static final URI FALLBACK_URI = URI.create("forward:/fallback");
    // Per-service CB ID — KHÔNG share. Trước đây dùng "defaultCircuitBreaker" cho tất cả routes,
    // khi 1 service trip CB (vd. /admin/llm/test với api-key chậm) → block toàn bộ routes khác
    // (chat, customers, vets...) trong 30s OPEN window. Per-service isolation đúng pattern.

    @Bean
    public RouterFunction<ServerResponse> customersServiceRoute() {
        return route("customers-service")
                .route(path("/api/v1/owners/**").or(path("/api/v1/pets/**")), http())
                .filter(lb("customers-service"))
                .filter(circuitBreaker(c -> c.setId("customersCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> vetsServiceRoute() {
        return route("vets-service")
                .route(path("/api/v1/vets/**").or(path("/api/v1/specialties/**")), http())
                .filter(lb("vets-service"))
                .filter(circuitBreaker(c -> c.setId("vetsCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> visitsServiceRoute() {
        return route("visits-service")
                .route(path("/api/v1/visits/**"), http())
                .filter(lb("visits-service"))
                .filter(circuitBreaker(c -> c.setId("visitsCircuitBreaker").setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    /**
     * AI chat — Phase 12b. JWT-protected ở downstream (genai-service security config).
     * CB scope rộng vì downstream call OpenRouter có thể chậm/lỗi không kiểm soát được.
     */
    @Bean
    public RouterFunction<ServerResponse> genaiServiceRoute() {
        return route("genai-service")
                .route(path("/api/v1/ai/**").or(path("/api/v1/admin/llm/**")), http())
                .filter(lb("genai-service"))
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
    public RouterFunction<ServerResponse> apiDocsGenaiRoute() {
        return route("api-docs-genai")
                .route(path("/v3/api-docs/genai"), http())
                .before(setPath("/v3/api-docs"))
                .filter(lb("genai-service"))
                .build();
    }
}
