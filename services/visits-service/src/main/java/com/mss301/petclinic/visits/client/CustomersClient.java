package com.mss301.petclinic.visits.client;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

/**
 * Declarative HTTP client cho customers-service.
 * Spring Framework 6+ HTTP Interface — không cần Feign.
 *
 * <p>Base URL bind ở {@code ClientsConfig} dạng {@code http://customers-service}
 * — Spring Cloud LoadBalancer resolve qua Eureka.
 */
@HttpExchange(accept = "application/json")
public interface CustomersClient {

    @GetExchange("/api/v1/pets/{id}")
    PetSummary getPet(@PathVariable Long id);

    @GetExchange("/api/v1/owners/{id}")
    OwnerSummary getOwner(@PathVariable Long id);
}
