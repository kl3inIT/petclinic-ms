package com.mss301.petclinic.products.service.impl;

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
import com.mss301.petclinic.products.service.ProductService;

@Service
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    private static final String ENTITY = "Product";

    private final ProductRepository repository;

    public ProductServiceImpl(ProductRepository repository) {
        this.repository = repository;
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
        if (repository.existsByCode(request.code())) {
            throw new BadRequestAlertException(
                    "Mã sản phẩm đã tồn tại: " + request.code(), ENTITY, "code-exists");
        }
        return ProductResponse.from(repository.save(request.toEntity()));
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, UpdateProductRequest request) {
        Product product = loadOrThrow(id);
        product.update(request.name(), request.category(), request.description(), request.unitPrice(),
                request.unit(), request.stockQuantity(), request.reorderLevel(), request.active());
        return ProductResponse.from(product);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        repository.delete(loadOrThrow(id));
    }

    @Override
    @Transactional
    public ProductResponse consumeStock(Long id, int quantity) {
        Product product = loadOrThrow(id);
        if (!product.isStockTracked()) {
            throw new BadRequestAlertException(
                    "Sản phẩm không quản lý tồn kho: " + product.getCode(), ENTITY, "not-stock-tracked");
        }
        if (quantity <= 0) {
            throw new BadRequestAlertException("Số lượng phải > 0", ENTITY, "quantity-invalid");
        }
        Integer stock = product.getStockQuantity();
        if (stock == null || stock < quantity) {
            throw new BadRequestAlertException(
                    "Không đủ tồn kho " + product.getCode() + " (còn " + (stock == null ? 0 : stock)
                            + ", cần " + quantity + ")", ENTITY, "insufficient-stock");
        }
        product.consume(quantity);
        return ProductResponse.from(product);
    }

    @Override
    @Transactional
    public ProductResponse restock(Long id, int quantity) {
        Product product = loadOrThrow(id);
        if (!product.isStockTracked()) {
            throw new BadRequestAlertException(
                    "Sản phẩm không quản lý tồn kho: " + product.getCode(), ENTITY, "not-stock-tracked");
        }
        if (quantity <= 0) {
            throw new BadRequestAlertException("Số lượng phải > 0", ENTITY, "quantity-invalid");
        }
        product.restock(quantity);
        return ProductResponse.from(product);
    }

    private Product loadOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(String.valueOf(id)));
    }
}
