package com.mss301.petclinic.billing.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.Test;

/**
 * Unit test thuần domain cho {@link Invoice} aggregate — không cần Spring/Docker.
 * Kiểm recompute tổng, idempotency phí khám, và state machine OPEN→PAID/CANCELLED.
 */
class InvoiceTest {

    private static final UUID CUSTOMER = UUID.randomUUID();

    @Test
    void newInvoice_isOpen_withZeroTotal() {
        Invoice inv = Invoice.open(CUSTOMER, "Nguyễn Văn A");

        assertThat(inv.isOpen()).isTrue();
        assertThat(inv.getStatus()).isEqualTo(InvoiceStatus.OPEN);
        assertThat(inv.getSubtotal()).isEqualByComparingTo("0");
        assertThat(inv.getTotal()).isEqualByComparingTo("0");
        assertThat(inv.getCurrency()).isEqualTo("VND");
    }

    @Test
    void addItem_recomputesSubtotalAndTotal() {
        Invoice inv = Invoice.open(CUSTOMER, "A");

        inv.addItem(InvoiceItemSource.VISIT_FEE, 1L, "Phí khám", new BigDecimal("100000"), 1);
        inv.addItem(InvoiceItemSource.DISEASE, 5L, "Tiêm phòng dại", new BigDecimal("150000"), 2);

        // 100000 + 150000*2 = 400000
        assertThat(inv.getItems()).hasSize(2);
        assertThat(inv.getTotal()).isEqualByComparingTo("400000");
        assertThat(inv.getItems().get(1).getLineTotal()).isEqualByComparingTo("300000");
    }

    @Test
    void hasVisitFee_detectsExistingVisitLine() {
        Invoice inv = Invoice.open(CUSTOMER, "A");
        inv.addItem(InvoiceItemSource.VISIT_FEE, 42L, "Phí khám", new BigDecimal("100000"), 1);

        assertThat(inv.hasVisitFee(42L)).isTrue();
        assertThat(inv.hasVisitFee(99L)).isFalse();
    }

    @Test
    void checkout_movesToPaid_andFreezesEditing() {
        Invoice inv = Invoice.open(CUSTOMER, "A");
        inv.addItem(InvoiceItemSource.MISC, null, "Đồ shop", new BigDecimal("50000"), 1);

        inv.checkout(PaymentMethod.CASH);

        assertThat(inv.getStatus()).isEqualTo(InvoiceStatus.PAID);
        assertThat(inv.getPaymentMethod()).isEqualTo(PaymentMethod.CASH);
        assertThat(inv.getPaidAt()).isNotNull();
        // Đã chốt → không thêm dòng được nữa.
        assertThatThrownBy(() ->
                inv.addItem(InvoiceItemSource.MISC, null, "X", BigDecimal.TEN, 1))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void cancel_movesToCancelled() {
        Invoice inv = Invoice.open(CUSTOMER, "A");
        inv.cancel();
        assertThat(inv.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
    }

    @Test
    void cannotCheckoutAfterCancel() {
        Invoice inv = Invoice.open(CUSTOMER, "A");
        inv.cancel();
        assertThatThrownBy(() -> inv.checkout(PaymentMethod.CARD))
                .isInstanceOf(IllegalStateException.class);
    }
}
