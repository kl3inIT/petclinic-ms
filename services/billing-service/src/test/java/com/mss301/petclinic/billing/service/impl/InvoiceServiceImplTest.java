package com.mss301.petclinic.billing.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import com.mss301.petclinic.billing.client.ProductsClient;
import com.mss301.petclinic.billing.dto.req.CheckoutRequest;
import com.mss301.petclinic.billing.model.Invoice;
import com.mss301.petclinic.billing.model.InvoiceItemSource;
import com.mss301.petclinic.billing.model.InvoiceStatus;
import com.mss301.petclinic.billing.model.PaymentMethod;
import com.mss301.petclinic.billing.repository.DiseaseRepository;
import com.mss301.petclinic.billing.repository.InvoiceRepository;
import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

class InvoiceServiceImplTest {

    private InvoiceRepository invoices;
    private ProductsClient products;
    private InvoiceServiceImpl service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        invoices = mock(InvoiceRepository.class);
        products = mock(ProductsClient.class);
        ObjectProvider<EventPublisher> events = mock(ObjectProvider.class);
        when(events.getIfAvailable()).thenReturn(null);
        service = new InvoiceServiceImpl(invoices, mock(DiseaseRepository.class), products, events);
    }

    @Test
    void checkoutValidatesTransferReferenceBeforeInventoryCall() {
        Invoice invoice = invoiceWithProductLines();
        when(invoices.findById(7L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> service.checkout(7L, new CheckoutRequest(PaymentMethod.TRANSFER, " ")))
                .isInstanceOf(BadRequestAlertException.class)
                .extracting("errorKey")
                .isEqualTo("payment-reference-required");

        verify(products, never()).consumeBatch(any());
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.OPEN);
    }

    @Test
    void checkoutAggregatesLinesAndUsesStableIdempotencyKey() {
        Invoice invoice = invoiceWithProductLines();
        when(invoices.findById(7L)).thenReturn(Optional.of(invoice));

        service.checkout(7L, new CheckoutRequest(PaymentMethod.CASH, null));

        ArgumentCaptor<ProductsClient.BatchStockConsume> captor =
                ArgumentCaptor.forClass(ProductsClient.BatchStockConsume.class);
        verify(products).consumeBatch(captor.capture());
        assertThat(captor.getValue().idempotencyKey()).isEqualTo("invoice:7:checkout");
        assertThat(captor.getValue().items()).singleElement().satisfies(line -> {
            assertThat(line.productId()).isEqualTo(11L);
            assertThat(line.quantity()).isEqualTo(5);
        });
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void inventoryFailureLeavesInvoiceOpen() {
        Invoice invoice = invoiceWithProductLines();
        when(invoices.findById(7L)).thenReturn(Optional.of(invoice));
        when(products.consumeBatch(any())).thenThrow(new RuntimeException("products unavailable"));

        assertThatThrownBy(() -> service.checkout(7L, new CheckoutRequest(PaymentMethod.CASH, null)))
                .hasMessageContaining("products unavailable");
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.OPEN);
    }

    private static Invoice invoiceWithProductLines() {
        Invoice invoice = Invoice.open(null, "Walk-in");
        ReflectionTestUtils.setField(invoice, "id", 7L);
        invoice.addItem(InvoiceItemSource.PRODUCT, 11L, "Product", BigDecimal.TEN, 2);
        invoice.addItem(InvoiceItemSource.PRODUCT, 11L, "Product", BigDecimal.TEN, 3);
        return invoice;
    }
}
