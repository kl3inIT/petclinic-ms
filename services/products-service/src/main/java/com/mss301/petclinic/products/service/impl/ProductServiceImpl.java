package com.mss301.petclinic.products.service.impl;

import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.products.dto.req.CreateProductRequest;
import com.mss301.petclinic.products.dto.req.UpdateProductRequest;
import com.mss301.petclinic.products.dto.res.ProductResponse;
import com.mss301.petclinic.products.exception.ProductNotFoundException;
import com.mss301.petclinic.products.model.Product;
import com.mss301.petclinic.products.model.ProductType;
import com.mss301.petclinic.products.repository.ProductRepository;
import com.mss301.petclinic.products.repository.ProductSpecifications;
import com.mss301.petclinic.products.service.InventoryService;
import com.mss301.petclinic.products.service.ProductService;

@Service
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    private static final String ENTITY = "Product";

    private final ProductRepository repository;
    private final InventoryService inventoryService;

    public ProductServiceImpl(ProductRepository repository, InventoryService inventoryService) {
        this.repository = repository;
        this.inventoryService = inventoryService;
    }

    @Override
    public Page<ProductResponse> search(String q, ProductType type, Boolean active, Boolean lowStock,
                                        Pageable pageable) {
        return repository.findAll(ProductSpecifications.filter(q, type, active, lowStock), pageable)
                .map(ProductResponse::from);
    }

    @Override
    public ProductResponse getById(Long id) {
        return ProductResponse.from(loadOrThrow(id));
    }

    @Override
    @Transactional
    public ProductResponse create(CreateProductRequest request) {
        String normalizedCode = request.code().trim().toUpperCase(Locale.ROOT);
        if (repository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new BadRequestAlertException(
                    "Mã sản phẩm đã tồn tại: " + normalizedCode, ENTITY, "code-exists");
        }
        int initialStock = request.type().isStockTracked() && request.stockQuantity() != null
                ? request.stockQuantity()
                : 0;
        Product product = repository.saveAndFlush(request.toEntity(0));
        if (initialStock > 0) {
            return inventoryService.initializeStock(
                    product.getId(), initialStock, "product:" + product.getId() + ":initial-stock");
        }
        return ProductResponse.from(product);
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, UpdateProductRequest request) {
        Product product = loadOrThrow(id);
        if (request.stockQuantity() != null
                && !request.stockQuantity().equals(product.getStockQuantity())) {
            throw new BadRequestAlertException(
                    "Không cập nhật tồn kho qua catalog; hãy dùng thao tác kho có audit",
                    ENTITY, "stock-update-requires-operation");
        }
        product.update(request.name(), request.category(), request.description(), request.unitPrice(),
                request.unit(), request.reorderLevel(), request.active());
        return ProductResponse.from(product);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        loadOrThrow(id).deactivate();
    }

    @Override
    @Transactional
    public ProductResponse consumeStock(Long id, int quantity) {
        return inventoryService.consumeSingle(id, quantity, "compat:consume:" + UUID.randomUUID());
    }

    @Override
    @Transactional
    public ProductResponse restock(Long id, int quantity) {
        return inventoryService.restockSingle(id, quantity, "compat:restock:" + UUID.randomUUID());
    }

    private Product loadOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(String.valueOf(id)));
    }
}
