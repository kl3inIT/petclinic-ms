package com.mss301.petclinic.products.dto.res;

import java.util.List;

import com.mss301.petclinic.products.model.InventoryOperation;
import com.mss301.petclinic.products.model.InventoryOperationType;
import com.mss301.petclinic.products.model.StockMovement;

public record InventoryOperationResponse(
        Long id,
        String idempotencyKey,
        InventoryOperationType operationType,
        String sourceType,
        String sourceId,
        String reason,
        List<StockMovementResponse> movements
) {
    public static InventoryOperationResponse from(InventoryOperation operation,
                                                  List<StockMovement> movements) {
        return new InventoryOperationResponse(
                operation.getId(), operation.getIdempotencyKey(), operation.getOperationType(),
                operation.getSourceType(), operation.getSourceId(), operation.getReason(),
                movements.stream().map(StockMovementResponse::from).toList());
    }
}
