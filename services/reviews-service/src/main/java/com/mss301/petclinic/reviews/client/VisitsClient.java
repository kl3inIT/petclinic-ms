package com.mss301.petclinic.reviews.client;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

/**
 * Declarative HTTP client cho visits-service. Spring Framework 6+ HTTP Interface — không Feign.
 *
 * <p>Base URL bind ở {@code ClientsConfig} dạng {@code http://visits-service}
 * — Spring Cloud LoadBalancer resolve qua Eureka.
 *
 * <p>JWT forward tự động qua {@code JwtForwardInterceptor} của shared/common-clients —
 * visits-service vẫn validate JWT độc lập (defense-in-depth).
 */
@HttpExchange(accept = "application/json")
public interface VisitsClient {

    @GetExchange("/api/v1/visits/{id}")
    VisitSummary getVisit(@PathVariable Long id);
}
