package com.mss301.petclinic.visits.client;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

/**
 * Declarative HTTP client cho products-service (catalog thuốc/dịch vụ + tồn kho).
 * Base URL {@code http://products-service} bind ở {@code ClientsConfig} — LB qua Eureka.
 *
 * <p>JWT của vet được forward tự động (common-clients {@code JwtForwardInterceptor}) → đủ
 * quyền gọi {@code /consume} (rule STAFF/ADMIN/VET ở products-service).
 */
@HttpExchange(accept = "application/json")
public interface ProductsClient {

    @GetExchange("/api/v1/products/{id}")
    ProductSummary getProduct(@PathVariable Long id);

    /** Trừ tồn kho khi cấp phát thuốc/vật tư. Trả về sản phẩm sau khi trừ. */
    @PostExchange("/api/v1/products/{id}/consume")
    ProductSummary consume(@PathVariable Long id, @RequestBody StockAdjust body);

    /** Body cho consume — khớp {@code StockAdjustRequest} ở products-service. */
    record StockAdjust(Integer quantity) {}
}
