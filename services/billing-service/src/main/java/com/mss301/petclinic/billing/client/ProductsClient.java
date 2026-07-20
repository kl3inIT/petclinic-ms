package com.mss301.petclinic.billing.client;

import java.util.List;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

/**
 * Declarative HTTP client cho products-service. Base URL {@code http://products-service}
 * bind ở {@code ClientsConfig} — LB qua Eureka. JWT của quầy (STAFF/ADMIN) forward tự động
 * (common-clients {@code JwtForwardInterceptor}) → đủ quyền gọi {@code /consume}.
 */
@HttpExchange(accept = "application/json")
public interface ProductsClient {

    @GetExchange("/api/v1/products/{id}")
    ProductSummary getProduct(@PathVariable Long id);

    /** Atomic, idempotent consume used by checkout. */
    @PostExchange("/api/v1/products/stock/consume")
    InventoryOperationSummary consumeBatch(@RequestBody BatchStockConsume body);

    record BatchStockConsume(
            String idempotencyKey,
            String sourceType,
            String sourceId,
            String reason,
            List<Line> items
    ) {
        public record Line(Long productId, Integer quantity) {}
    }

    record InventoryOperationSummary(Long id, String idempotencyKey) {}
}
