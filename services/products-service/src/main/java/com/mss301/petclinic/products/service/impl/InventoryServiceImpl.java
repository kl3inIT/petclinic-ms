package com.mss301.petclinic.products.service.impl;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.products.dto.req.BatchStockConsumeRequest;
import com.mss301.petclinic.products.dto.req.ManualStockDocumentRequest;
import com.mss301.petclinic.products.dto.res.InventoryOperationResponse;
import com.mss301.petclinic.products.dto.res.ProductResponse;
import com.mss301.petclinic.products.dto.res.StockMovementResponse;
import com.mss301.petclinic.products.exception.ProductNotFoundException;
import com.mss301.petclinic.products.model.InventoryOperation;
import com.mss301.petclinic.products.model.InventoryOperationType;
import com.mss301.petclinic.products.model.Product;
import com.mss301.petclinic.products.model.StockMovement;
import com.mss301.petclinic.products.repository.InventoryOperationRepository;
import com.mss301.petclinic.products.repository.ProductRepository;
import com.mss301.petclinic.products.repository.StockMovementRepository;
import com.mss301.petclinic.products.service.InventoryService;

@Service
@Transactional(readOnly = true)
public class InventoryServiceImpl implements InventoryService {

    private static final String ENTITY = "InventoryOperation";

    private final ProductRepository productRepository;
    private final InventoryOperationRepository operationRepository;
    private final StockMovementRepository movementRepository;
    private final JdbcTemplate jdbcTemplate;

    public InventoryServiceImpl(ProductRepository productRepository,
                                InventoryOperationRepository operationRepository,
                                StockMovementRepository movementRepository,
                                JdbcTemplate jdbcTemplate) {
        this.productRepository = productRepository;
        this.operationRepository = operationRepository;
        this.movementRepository = movementRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public InventoryOperationResponse consume(BatchStockConsumeRequest request) {
        Map<Long, Integer> quantities = aggregate(request.items());
        String key = normalizeRequired(request.idempotencyKey(), "idempotency-key-required");
        requireMaxLength(key, 160, "idempotency-key-too-long");
        String sourceType = normalizeRequired(request.sourceType(), "source-type-required")
                .toUpperCase(Locale.ROOT);
        requireMaxLength(sourceType, 40, "source-type-too-long");
        String sourceId = normalizeNullable(request.sourceId());
        requireMaxLength(sourceId, 120, "source-id-too-long");
        String reason = normalizeNullable(request.reason());
        requireMaxLength(reason, 255, "reason-too-long");
        String fingerprint = fingerprint(InventoryOperationType.CONSUME, sourceType, sourceId, quantities);

        lockIdempotencyKey(key);
        var existing = operationRepository.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            return replay(existing.get(), fingerprint);
        }

        List<Product> products = lockProducts(quantities);
        // Validate the full batch before the first mutation. The transaction remains the final
        // atomicity boundary, while this ordering also keeps the aggregate consistent in memory.
        for (Product product : products) {
            requireMutableStock(product);
            int quantity = quantities.get(product.getId());
            if (product.getStockQuantity() == null || product.getStockQuantity() < quantity) {
                throw new BadRequestAlertException(
                        "Không đủ tồn kho " + product.getCode() + " (còn "
                                + (product.getStockQuantity() == null ? 0 : product.getStockQuantity())
                                + ", cần " + quantity + ")",
                        ENTITY, "insufficient-stock");
            }
        }
        InventoryOperation operation = operationRepository.save(new InventoryOperation(
                key, InventoryOperationType.CONSUME, sourceType, sourceId, reason, fingerprint));
        List<StockMovement> movements = new ArrayList<>(products.size());
        for (Product product : products) {
            int before = product.getStockQuantity();
            int quantity = quantities.get(product.getId());
            product.consume(quantity);
            movements.add(new StockMovement(operation, product, -quantity, before, product.getStockQuantity()));
        }
        movementRepository.saveAll(movements);
        return InventoryOperationResponse.from(operation, movements);
    }

    @Override
    @Transactional
    public InventoryOperationResponse recordManualDocument(ManualStockDocumentRequest request) {
        if (request.direction() == null) {
            throw new BadRequestAlertException("Loại giao dịch là bắt buộc", ENTITY, "direction-required");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new BadRequestAlertException("Phiếu kho phải có ít nhất một dòng hàng", ENTITY, "items-required");
        }

        Map<Long, Integer> quantities = aggregateManual(request.items());
        String reason = normalizeRequired(request.reason(), "reason-required");
        requireMaxLength(reason, 255, "reason-too-long");
        String reference = normalizeNullable(request.reference());
        requireMaxLength(reference, 120, "reference-too-long");

        if (request.direction() == ManualStockDocumentRequest.Direction.IN) {
            return increaseOperation(
                    quantities, request.idempotencyKey(), InventoryOperationType.RESTOCK,
                    "MANUAL", reference, reason);
        }

        return consume(new BatchStockConsumeRequest(
                request.idempotencyKey(), "MANUAL", reference, reason,
                quantities.entrySet().stream()
                        .map(entry -> new BatchStockConsumeRequest.Line(entry.getKey(), entry.getValue()))
                        .toList()));
    }

    @Override
    @Transactional
    public ProductResponse consumeSingle(Long productId, int quantity, String idempotencyKey) {
        consume(new BatchStockConsumeRequest(
                idempotencyKey, "COMPATIBILITY_API", String.valueOf(productId),
                "Single-product stock consume", List.of(new BatchStockConsumeRequest.Line(productId, quantity))));
        return currentProduct(productId);
    }

    @Override
    @Transactional
    public ProductResponse initializeStock(Long productId, int quantity, String idempotencyKey) {
        return increaseSingle(productId, quantity, idempotencyKey, InventoryOperationType.INITIAL,
                "CATALOG", "Initial stock recorded when product was created");
    }

    @Override
    @Transactional
    public ProductResponse restockSingle(Long productId, int quantity, String idempotencyKey) {
        return increaseSingle(productId, quantity, idempotencyKey, InventoryOperationType.RESTOCK,
                "COMPATIBILITY_API", "Single-product restock");
    }

    private ProductResponse increaseSingle(Long productId, int quantity, String idempotencyKey,
                                           InventoryOperationType operationType, String sourceType,
                                           String reason) {
        increaseSingleOperation(productId, quantity, idempotencyKey, operationType, sourceType,
                String.valueOf(productId), reason);
        return currentProduct(productId);
    }

    private InventoryOperationResponse increaseSingleOperation(
            Long productId, int quantity, String idempotencyKey,
            InventoryOperationType operationType, String sourceType, String sourceId,
            String reason) {
        if (quantity <= 0) {
            throw new BadRequestAlertException("Số lượng phải > 0", ENTITY, "quantity-invalid");
        }
        return increaseOperation(Map.of(productId, quantity), idempotencyKey, operationType,
                sourceType, sourceId, reason);
    }

    private InventoryOperationResponse increaseOperation(
            Map<Long, Integer> quantities, String idempotencyKey,
            InventoryOperationType operationType, String sourceType, String sourceId,
            String reason) {
        String key = normalizeRequired(idempotencyKey, "idempotency-key-required");
        requireMaxLength(key, 160, "idempotency-key-too-long");
        String normalizedSourceType = normalizeRequired(sourceType, "source-type-required")
                .toUpperCase(Locale.ROOT);
        requireMaxLength(normalizedSourceType, 40, "source-type-too-long");
        String normalizedSourceId = normalizeNullable(sourceId);
        requireMaxLength(normalizedSourceId, 120, "source-id-too-long");
        String normalizedReason = normalizeNullable(reason);
        requireMaxLength(normalizedReason, 255, "reason-too-long");
        String fingerprint = fingerprint(operationType, normalizedSourceType,
                normalizedSourceId, quantities);
        lockIdempotencyKey(key);
        var existing = operationRepository.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            return replay(existing.get(), fingerprint);
        }

        List<Product> products = lockProducts(quantities);
        for (Product product : products) {
            requireMutableStock(product);
            try {
                Math.addExact(
                        product.getStockQuantity() == null ? 0 : product.getStockQuantity(),
                        quantities.get(product.getId()));
            } catch (ArithmeticException ex) {
                throw new BadRequestAlertException(
                        "Số lượng tồn kho vượt giới hạn: " + product.getCode(),
                        ENTITY, "stock-overflow");
            }
        }
        InventoryOperation operation = operationRepository.save(new InventoryOperation(
                key, operationType, normalizedSourceType, normalizedSourceId,
                normalizedReason, fingerprint));
        List<StockMovement> movements = new ArrayList<>(products.size());
        for (Product product : products) {
            int before = product.getStockQuantity();
            int quantity = quantities.get(product.getId());
            product.restock(quantity);
            movements.add(new StockMovement(
                    operation, product, quantity, before, product.getStockQuantity()));
        }
        movementRepository.saveAll(movements);
        return InventoryOperationResponse.from(operation, movements);
    }

    @Override
    public Page<StockMovementResponse> listMovements(Pageable pageable) {
        return movementRepository.findAllWithDetails(pageable).map(StockMovementResponse::from);
    }

    @Override
    public Page<StockMovementResponse> listMovements(Long productId, Pageable pageable) {
        if (!productRepository.existsById(productId)) {
            throw new ProductNotFoundException(String.valueOf(productId));
        }
        return movementRepository.findAllByProductId(productId, pageable).map(StockMovementResponse::from);
    }

    private ProductResponse currentProduct(Long productId) {
        return ProductResponse.from(productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(String.valueOf(productId))));
    }

    private InventoryOperationResponse replay(InventoryOperation operation, String fingerprint) {
        if (!operation.getRequestFingerprint().equals(fingerprint)) {
            throw new BadRequestAlertException(
                    "Idempotency key đã được dùng cho payload khác", ENTITY, "idempotency-key-conflict");
        }
        return InventoryOperationResponse.from(operation,
                movementRepository.findAllByOperationIdOrderById(operation.getId()));
    }

    private List<Product> lockProducts(Map<Long, Integer> quantities) {
        List<Product> products = productRepository.findAllByIdForUpdate(quantities.keySet());
        if (products.size() != quantities.size()) {
            var found = products.stream().map(Product::getId).collect(java.util.stream.Collectors.toSet());
            Long missing = quantities.keySet().stream().filter(id -> !found.contains(id)).findFirst().orElseThrow();
            throw new ProductNotFoundException(String.valueOf(missing));
        }
        return products;
    }

    private static void requireMutableStock(Product product) {
        if (!product.isActive()) {
            throw new BadRequestAlertException(
                    "Sản phẩm đã ngừng kinh doanh: " + product.getCode(), ENTITY, "product-inactive");
        }
        if (!product.isStockTracked()) {
            throw new BadRequestAlertException(
                    "Sản phẩm không quản lý tồn kho: " + product.getCode(), ENTITY, "not-stock-tracked");
        }
    }

    private static Map<Long, Integer> aggregate(List<BatchStockConsumeRequest.Line> items) {
        Map<Long, Integer> result = new TreeMap<>();
        try {
            for (var item : items) {
                result.merge(item.productId(), item.quantity(), Math::addExact);
            }
        } catch (ArithmeticException ex) {
            throw new BadRequestAlertException("Tổng số lượng vượt giới hạn", ENTITY, "quantity-overflow");
        }
        return result;
    }

    private static Map<Long, Integer> aggregateManual(List<ManualStockDocumentRequest.Line> items) {
        Map<Long, Integer> result = new TreeMap<>();
        try {
            for (var item : items) {
                if (item.productId() == null || item.quantity() == null || item.quantity() <= 0) {
                    throw new BadRequestAlertException(
                            "Dòng hàng không hợp lệ", ENTITY, "item-invalid");
                }
                result.merge(item.productId(), item.quantity(), Math::addExact);
            }
        } catch (ArithmeticException ex) {
            throw new BadRequestAlertException(
                    "Tổng số lượng vượt giới hạn", ENTITY, "quantity-overflow");
        }
        return result;
    }

    private void lockIdempotencyKey(String key) {
        jdbcTemplate.query("select pg_advisory_xact_lock(hashtextextended(?, 0))", rs -> null, key);
    }

    private static String fingerprint(InventoryOperationType type, String sourceType,
                                      String sourceId, Map<Long, Integer> quantities) {
        StringBuilder canonical = new StringBuilder(type.name()).append('|').append(sourceType)
                .append('|').append(sourceId == null ? "" : sourceId);
        quantities.forEach((id, quantity) -> canonical.append('|').append(id).append(':').append(quantity));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private static String normalizeRequired(String value, String errorKey) {
        String normalized = normalizeNullable(value);
        if (normalized == null) {
            throw new BadRequestAlertException("Giá trị bắt buộc bị thiếu", ENTITY, errorKey);
        }
        return normalized;
    }

    private static String normalizeNullable(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private static void requireMaxLength(String value, int maxLength, String errorKey) {
        if (value != null && value.length() > maxLength) {
            throw new BadRequestAlertException("Giá trị dài quá " + maxLength + " ký tự", ENTITY, errorKey);
        }
    }
}
