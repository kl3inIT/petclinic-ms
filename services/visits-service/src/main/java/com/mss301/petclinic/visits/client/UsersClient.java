package com.mss301.petclinic.visits.client;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import java.util.UUID;

/**
 * HTTP Interface gọi auth-service lookup user → enrich event (email, username)
 * trước khi publish lên RabbitMQ.
 *
 * <p>Base URL bind ở {@code ClientsConfig} dạng {@code http://auth-service}.
 * JWT của caller forward qua {@code JwtForwardInterceptor} (common-clients).
 */
@HttpExchange(accept = "application/json")
public interface UsersClient {

    @GetExchange("/api/v1/users/{id}")
    UserSummary getUser(@PathVariable UUID id);
}
