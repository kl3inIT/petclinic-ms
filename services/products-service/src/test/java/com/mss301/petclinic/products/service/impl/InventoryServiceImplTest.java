package com.mss301.petclinic.products.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.products.dto.req.BatchStockConsumeRequest;
import com.mss301.petclinic.products.dto.req.ManualStockDocumentRequest;
import com.mss301.petclinic.products.model.InventoryOperation;
import com.mss301.petclinic.products.model.InventoryOperationType;
import com.mss301.petclinic.products.model.Product;
import com.mss301.petclinic.products.model.ProductType;
import com.mss301.petclinic.products.model.StockMovement;
import com.mss301.petclinic.products.repository.InventoryOperationRepository;
import com.mss301.petclinic.products.repository.ProductRepository;
import com.mss301.petclinic.products.repository.StockMovementRepository;

class InventoryServiceImplTest {

    private ProductRepository products;
    private InventoryOperationRepository operations;
    private StockMovementRepository movements;
    private InventoryServiceImpl service;

    @BeforeEach
    void setUp() {
        products = mock(ProductRepository.class);
        operations = mock(InventoryOperationRepository.class);
        movements = mock(StockMovementRepository.class);
        service = new InventoryServiceImpl(products, operations, movements, mock(JdbcTemplate.class));
    }

    @Test
    void consumeAggregatesDuplicateLinesAndCreatesOneMovement() {
        Product product = product(1L, 10);
        when(operations.findByIdempotencyKey("invoice:7:checkout")).thenReturn(Optional.empty());
        when(products.findAllByIdForUpdate(any())).thenReturn(List.of(product));
        when(operations.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(movements.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.consume(request("invoice:7:checkout", 2, 3));

        assertThat(product.getStockQuantity()).isEqualTo(5);
        assertThat(response.movements()).singleElement().satisfies(movement -> {
            assertThat(movement.quantityBefore()).isEqualTo(10);
            assertThat(movement.quantityDelta()).isEqualTo(-5);
            assertThat(movement.quantityAfter()).isEqualTo(5);
        });
    }

    @Test
    void retryWithSameKeyReplaysWithoutMutatingStockAgain() {
        Product product = product(1L, 10);
        AtomicReference<InventoryOperation> savedOperation = new AtomicReference<>();
        AtomicReference<List<StockMovement>> savedMovements = new AtomicReference<>();
        when(operations.findByIdempotencyKey("invoice:7:checkout"))
                .thenAnswer(invocation -> Optional.ofNullable(savedOperation.get()));
        when(products.findAllByIdForUpdate(any())).thenReturn(List.of(product));
        when(operations.save(any())).thenAnswer(invocation -> {
            InventoryOperation operation = invocation.getArgument(0);
            savedOperation.set(operation);
            return operation;
        });
        when(movements.saveAll(any())).thenAnswer(invocation -> {
            List<StockMovement> result = invocation.getArgument(0);
            savedMovements.set(result);
            return result;
        });
        when(movements.findAllByOperationIdOrderById(any()))
                .thenAnswer(invocation -> savedMovements.get());

        service.consume(request("invoice:7:checkout", 2));
        service.consume(request("invoice:7:checkout", 2));

        assertThat(product.getStockQuantity()).isEqualTo(8);
        verify(products).findAllByIdForUpdate(any());
    }

    @Test
    void sameKeyWithDifferentPayloadIsRejected() {
        Product product = product(1L, 10);
        AtomicReference<InventoryOperation> savedOperation = new AtomicReference<>();
        when(operations.findByIdempotencyKey("invoice:7:checkout"))
                .thenAnswer(invocation -> Optional.ofNullable(savedOperation.get()));
        when(products.findAllByIdForUpdate(any())).thenReturn(List.of(product));
        when(operations.save(any())).thenAnswer(invocation -> {
            InventoryOperation operation = invocation.getArgument(0);
            savedOperation.set(operation);
            return operation;
        });
        when(movements.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.consume(request("invoice:7:checkout", 2));

        assertThatThrownBy(() -> service.consume(request("invoice:7:checkout", 3)))
                .isInstanceOf(BadRequestAlertException.class)
                .extracting("errorKey")
                .isEqualTo("idempotency-key-conflict");
        assertThat(product.getStockQuantity()).isEqualTo(8);
    }

    @Test
    void validatesEntireBatchBeforeFirstMutation() {
        Product first = product(1L, 10);
        Product insufficient = product(2L, 1);
        when(operations.findByIdempotencyKey("invoice:7:checkout")).thenReturn(Optional.empty());
        when(products.findAllByIdForUpdate(any())).thenReturn(List.of(first, insufficient));

        var request = new BatchStockConsumeRequest(
                "invoice:7:checkout", "INVOICE", "7", "checkout",
                List.of(new BatchStockConsumeRequest.Line(1L, 2),
                        new BatchStockConsumeRequest.Line(2L, 2)));

        assertThatThrownBy(() -> service.consume(request))
                .isInstanceOf(BadRequestAlertException.class)
                .extracting("errorKey")
                .isEqualTo("insufficient-stock");
        assertThat(first.getStockQuantity()).isEqualTo(10);
    }

    @Test
    void manualInboundAggregatesLinesAndRecordsOneDocument() {
        Product first = product(1L, 10);
        Product second = product(2L, 5);
        when(operations.findByIdempotencyKey("manual:in:1")).thenReturn(Optional.empty());
        when(products.findAllByIdForUpdate(any())).thenReturn(List.of(first, second));
        when(operations.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(movements.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.recordManualDocument(new ManualStockDocumentRequest(
                "manual:in:1", ManualStockDocumentRequest.Direction.IN,
                "Nhập hàng từ nhà cung cấp", "PO-1001",
                List.of(
                        new ManualStockDocumentRequest.Line(1L, 4),
                        new ManualStockDocumentRequest.Line(2L, 3),
                        new ManualStockDocumentRequest.Line(1L, 1))));

        assertThat(first.getStockQuantity()).isEqualTo(15);
        assertThat(second.getStockQuantity()).isEqualTo(8);
        assertThat(response.operationType()).isEqualTo(InventoryOperationType.RESTOCK);
        assertThat(response.sourceType()).isEqualTo("MANUAL");
        assertThat(response.sourceId()).isEqualTo("PO-1001");
        assertThat(response.reason()).isEqualTo("Nhập hàng từ nhà cung cấp");
        assertThat(response.movements())
                .extracting("productId", "quantityDelta", "quantityAfter")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1L, 5, 15),
                        org.assertj.core.groups.Tuple.tuple(2L, 3, 8));
    }

    @Test
    void manualOutboundValidatesEveryLineBeforeMutatingStock() {
        Product first = product(1L, 10);
        Product insufficient = product(2L, 3);
        when(operations.findByIdempotencyKey("manual:out:1")).thenReturn(Optional.empty());
        when(products.findAllByIdForUpdate(any())).thenReturn(List.of(first, insufficient));

        var request = new ManualStockDocumentRequest(
                "manual:out:1", ManualStockDocumentRequest.Direction.OUT,
                "Cấp phát nội bộ", "PX-9",
                List.of(
                        new ManualStockDocumentRequest.Line(1L, 2),
                        new ManualStockDocumentRequest.Line(2L, 4)));

        assertThatThrownBy(() -> service.recordManualDocument(request))
                .isInstanceOf(BadRequestAlertException.class)
                .extracting("errorKey")
                .isEqualTo("insufficient-stock");
        assertThat(first.getStockQuantity()).isEqualTo(10);
        assertThat(insufficient.getStockQuantity()).isEqualTo(3);
    }

    private static BatchStockConsumeRequest request(String key, int... quantities) {
        List<BatchStockConsumeRequest.Line> lines = java.util.Arrays.stream(quantities)
                .mapToObj(quantity -> new BatchStockConsumeRequest.Line(1L, quantity))
                .toList();
        return new BatchStockConsumeRequest(key, "INVOICE", "7", "checkout", lines);
    }

    private static Product product(Long id, int stock) {
        Product product = new Product("MED_" + id, "Product " + id, null, null,
                ProductType.MEDICATION, BigDecimal.ONE, "unit", stock, 2);
        ReflectionTestUtils.setField(product, "id", id);
        return product;
    }
}
