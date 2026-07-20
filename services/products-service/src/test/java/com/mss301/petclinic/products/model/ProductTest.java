package com.mss301.petclinic.products.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class ProductTest {

    @Test
    void consumeAndRestockPreserveStockInvariant() {
        Product product = product(10);

        product.consume(4);
        assertThat(product.getStockQuantity()).isEqualTo(6);

        product.restock(3);
        assertThat(product.getStockQuantity()).isEqualTo(9);

        assertThatThrownBy(() -> product.consume(10))
                .isInstanceOf(IllegalStateException.class);
        assertThat(product.getStockQuantity()).isEqualTo(9);
    }

    @Test
    void inactiveProductCannotMutateStock() {
        Product product = product(10);
        product.deactivate();

        assertThatThrownBy(() -> product.consume(1)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> product.restock(1)).isInstanceOf(IllegalStateException.class);
        assertThat(product.getStockQuantity()).isEqualTo(10);
    }

    @Test
    void constructorNormalizesBusinessCodeAndServiceDoesNotTrackStock() {
        Product product = new Product(" svc_gen ", "Khám", null, null, ProductType.SERVICE,
                BigDecimal.TEN, "lần", 99, 5);

        assertThat(product.getCode()).isEqualTo("SVC_GEN");
        assertThat(product.getStockQuantity()).isNull();
        assertThat(product.stockStatus()).isNull();
    }

    @Test
    void restockRejectsIntegerOverflow() {
        Product product = product(Integer.MAX_VALUE);
        assertThatThrownBy(() -> product.restock(1)).isInstanceOf(ArithmeticException.class);
    }

    @Test
    void vaccineIsStockTracked() {
        Product vaccine = new Product("VAC_TEST", "Vaccine", null, null, ProductType.VACCINE,
                BigDecimal.ONE, "liều", 8, 2);

        assertThat(vaccine.isStockTracked()).isTrue();
        vaccine.consume(3);
        assertThat(vaccine.getStockQuantity()).isEqualTo(5);
    }

    private static Product product(int stock) {
        return new Product("MED_TEST", "Test", null, null, ProductType.MEDICATION,
                BigDecimal.ONE, "viên", stock, 2);
    }
}
