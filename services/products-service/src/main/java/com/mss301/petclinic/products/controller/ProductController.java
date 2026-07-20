package com.mss301.petclinic.products.controller;

import java.net.URI;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.mss301.petclinic.products.dto.req.CreateProductRequest;
import com.mss301.petclinic.products.dto.req.StockAdjustRequest;
import com.mss301.petclinic.products.dto.req.UpdateProductRequest;
import com.mss301.petclinic.products.dto.res.ProductResponse;
import com.mss301.petclinic.products.model.ProductType;
import com.mss301.petclinic.products.service.InventoryService;
import com.mss301.petclinic.products.service.ProductService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Catalog thuốc / dịch vụ khám / vật tư + tồn kho. Catalog read là public cho storefront;
 * write, lịch sử movement và điều chỉnh kho chỉ ADMIN/INVENTORY_MANAGER
 * (khai báo ở {@link com.mss301.petclinic.products.config.ProductsSecurityConfig}).
 *
 * <p>Endpoint {@code /{id}/consume} dùng nội bộ — visits-service gọi (forward JWT) để
 * trừ kho khi kê đơn.
 *
 * <p>Method name UNIQUE cross-service cho OpenAPI aggregation (gotcha #23):
 * listProducts / getProduct / createProduct / updateProduct / deleteProduct /
 * consumeProduct / restockProduct.
 */
@RestController
@RequestMapping("/api/v1/products")
@Tag(name = "Products", description = "Catalog thuốc / dịch vụ / vật tư + tồn kho")
public class ProductController {

    private final ProductService service;
    private final InventoryService inventoryService;

    public ProductController(ProductService service, InventoryService inventoryService) {
        this.service = service;
        this.inventoryService = inventoryService;
    }

    @GetMapping
    @Operation(summary = "List sản phẩm — lọc q (code/name), type, active, lowStock")
    public Page<ProductResponse> listProducts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ProductType type,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean lowStock,
            Pageable pageable) {
        return service.search(q, type, active, lowStock, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết sản phẩm")
    public ProductResponse getProduct(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    @Operation(summary = "Tạo sản phẩm mới (ADMIN/INVENTORY_MANAGER)")
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody CreateProductRequest request) {
        ProductResponse created = service.create(request);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Cập nhật sản phẩm (ADMIN/INVENTORY_MANAGER)")
    public ProductResponse updateProduct(@PathVariable Long id,
                                         @Valid @RequestBody UpdateProductRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Ngừng kinh doanh sản phẩm, giữ lịch sử (ADMIN/INVENTORY_MANAGER)")
    public void deleteProduct(@PathVariable Long id) {
        service.delete(id);
    }

    @PostMapping("/{id}/consume")
    @Operation(summary = "Trừ tồn kho — cấp phát thuốc/vật tư (STAFF/ADMIN/VET, dùng nội bộ khi kê đơn)")
    public ProductResponse consumeProduct(@PathVariable Long id,
                                          @RequestHeader(value = "Idempotency-Key", required = false)
                                          String idempotencyKey,
                                          @Valid @RequestBody StockAdjustRequest request) {
        String key = idempotencyKey != null ? idempotencyKey : "compat:consume:" + UUID.randomUUID();
        return inventoryService.consumeSingle(id, request.quantity(), key);
    }

    @PostMapping("/{id}/restock")
    @Operation(summary = "Nhập thêm tồn kho (ADMIN/INVENTORY_MANAGER)")
    public ProductResponse restockProduct(@PathVariable Long id,
                                          @RequestHeader(value = "Idempotency-Key", required = false)
                                          String idempotencyKey,
                                          @Valid @RequestBody StockAdjustRequest request) {
        String key = idempotencyKey != null ? idempotencyKey : "compat:restock:" + UUID.randomUUID();
        return inventoryService.restockSingle(id, request.quantity(), key);
    }
}
