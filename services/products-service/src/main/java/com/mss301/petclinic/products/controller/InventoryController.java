package com.mss301.petclinic.products.controller;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.products.dto.req.BatchStockConsumeRequest;
import com.mss301.petclinic.products.dto.req.ManualStockDocumentRequest;
import com.mss301.petclinic.products.dto.res.InventoryOperationResponse;
import com.mss301.petclinic.products.dto.res.StockMovementResponse;
import com.mss301.petclinic.products.service.InventoryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/products/stock")
@Tag(name = "Inventory", description = "Atomic and idempotent stock operations")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping("/consume")
    @Operation(summary = "Atomically consume stock for one or more products")
    public InventoryOperationResponse consume(@Valid @RequestBody BatchStockConsumeRequest request) {
        return inventoryService.consume(request);
    }

    @PostMapping("/documents")
    @Operation(summary = "Record an audited multi-line stock receipt or issue document")
    public InventoryOperationResponse recordManualInventoryDocument(
            @Valid @RequestBody ManualStockDocumentRequest request) {
        return inventoryService.recordManualDocument(request);
    }

    @GetMapping("/movements")
    @Operation(summary = "List append-only stock movements across all products")
    public Page<StockMovementResponse> listInventoryMovements(Pageable pageable) {
        return inventoryService.listMovements(pageable);
    }

    @GetMapping("/{productId}/movements")
    @Operation(summary = "List append-only stock movements for a product")
    public Page<StockMovementResponse> listMovements(@PathVariable Long productId, Pageable pageable) {
        return inventoryService.listMovements(productId, pageable);
    }
}
