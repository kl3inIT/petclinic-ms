package com.mss301.petclinic.billing.client;

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

    /** Trừ tồn kho khi bán (gọi lúc checkout). */
    @PostExchange("/api/v1/products/{id}/consume")
    ProductSummary consume(@PathVariable Long id, @RequestBody StockAdjust body);

    /** Body khớp {@code StockAdjustRequest} ở products-service. */
    record StockAdjust(Integer quantity) {}
}
