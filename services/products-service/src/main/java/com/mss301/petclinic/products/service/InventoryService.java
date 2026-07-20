package com.mss301.petclinic.products.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.products.dto.req.BatchStockConsumeRequest;
import com.mss301.petclinic.products.dto.req.ManualStockDocumentRequest;
import com.mss301.petclinic.products.dto.res.InventoryOperationResponse;
import com.mss301.petclinic.products.dto.res.ProductResponse;
import com.mss301.petclinic.products.dto.res.StockMovementResponse;

public interface InventoryService {
    InventoryOperationResponse consume(BatchStockConsumeRequest request);
    InventoryOperationResponse recordManualDocument(ManualStockDocumentRequest request);
    ProductResponse consumeSingle(Long productId, int quantity, String idempotencyKey);
    ProductResponse initializeStock(Long productId, int quantity, String idempotencyKey);
    ProductResponse restockSingle(Long productId, int quantity, String idempotencyKey);
    Page<StockMovementResponse> listMovements(Pageable pageable);
    Page<StockMovementResponse> listMovements(Long productId, Pageable pageable);
}
