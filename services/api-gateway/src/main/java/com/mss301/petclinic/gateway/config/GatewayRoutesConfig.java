package com.mss301.petclinic.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

import java.net.URI;

import static org.springframework.cloud.gateway.server.mvc.filter.CircuitBreakerFilterFunctions.circuitBreaker;
import static org.springframework.cloud.gateway.server.mvc.filter.LoadBalancerFilterFunctions.lb;
import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;
import static org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions.http;
import static org.springframework.cloud.gateway.server.mvc.predicate.GatewayRequestPredicates.path;

/**
 * Gateway routes — functional API (canonical pattern cho Spring Cloud Gateway 5.x WebMVC variant).
 *
 * <h4>Tại sao functional thay vì YAML?</h4>
 * <p>YAML {@code spring.cloud.gateway.server.webmvc.routes} hỗ trợ predicates + uri OK, nhưng
 * filter shortcut {@code CircuitBreaker=...} không apply chained inside CB wrapper trong 5.0.x.
 * Functional builder wires filter chain trực tiếp → CB thực sự gói call, count failures, mở khi
 * threshold đạt, forward sang /fallback.</p>
 *
 * <h4>Path predicates</h4>
 * Mỗi service có nhiều path → dùng {@code path(p1).or(path(p2))} gộp 1 route id.
 *
 * <h4>Filter chain (thứ tự áp dụng)</h4>
 * <ol>
 *   <li>{@code lb("service-name")} — resolve `lb://` qua Spring Cloud LoadBalancer (Eureka registry)</li>
 *   <li>{@code circuitBreaker(...)} — gói downstream call; mở circuit nếu failure rate cao,
 *       forward sang `/fallback` thay vì lỗi 500</li>
 * </ol>
 */
@Configuration
public class GatewayRoutesConfig {

    private static final URI FALLBACK_URI = URI.create("forward:/fallback");
    private static final String CB_ID = "defaultCircuitBreaker";

    @Bean
    public RouterFunction<ServerResponse> customersServiceRoute() {
        return route("customers-service")
                .route(path("/api/v1/owners/**").or(path("/api/v1/pets/**")), http())
                .filter(lb("customers-service"))
                .filter(circuitBreaker(c -> c.setId(CB_ID).setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> vetsServiceRoute() {
        return route("vets-service")
                .route(path("/api/v1/vets/**").or(path("/api/v1/specialties/**")), http())
                .filter(lb("vets-service"))
                .filter(circuitBreaker(c -> c.setId(CB_ID).setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> authServiceRoute() {
        return route("auth-service")
                .route(path("/api/v1/auth/**"), http())
                .filter(lb("auth-service"))
                .filter(circuitBreaker(c -> c.setId(CB_ID).setFallbackUri(FALLBACK_URI.toString())))
                .build();
    }
}
