package com.mss301.petclinic.products.dto.res;

import java.time.Instant;

import com.mss301.petclinic.products.model.InventoryOperationType;
import com.mss301.petclinic.products.model.StockMovement;

public record StockMovementResponse(
        Long id,
        Long operationId,
        String idempotencyKey,
        InventoryOperationType operationType,
        String sourceType,
        String sourceId,
        String reason,
        Long productId,
        String productCode,
        int quantityDelta,
        int quantityBefore,
        int quantityAfter,
        String createdBy,
        Instant createdDate
) {
    public static StockMovementResponse from(StockMovement movement) {
        var operation = movement.getOperation();
        var product = movement.getProduct();
        return new StockMovementResponse(
                movement.getId(), operation.getId(), operation.getIdempotencyKey(),
                operation.getOperationType(), operation.getSourceType(), operation.getSourceId(),
                operation.getReason(), product.getId(), product.getCode(), movement.getQuantityDelta(),
                movement.getQuantityBefore(), movement.getQuantityAfter(), movement.getCreatedBy(),
                movement.getCreatedDate());
    }
}
