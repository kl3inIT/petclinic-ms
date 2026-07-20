package com.mss301.petclinic.products.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.mss301.petclinic.products.dto.req.CreateProductRequest;
import com.mss301.petclinic.products.dto.res.ProductResponse;
import com.mss301.petclinic.products.model.Product;
import com.mss301.petclinic.products.model.ProductType;
import com.mss301.petclinic.products.repository.ProductRepository;
import com.mss301.petclinic.products.service.InventoryService;

class ProductServiceImplTest {

    @Test
    void createRecordsInitialStockThroughInventoryLedger() {
        ProductRepository products = mock(ProductRepository.class);
        InventoryService inventory = mock(InventoryService.class);
        ProductServiceImpl service = new ProductServiceImpl(products, inventory);
        when(products.saveAndFlush(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            ReflectionTestUtils.setField(product, "id", 42L);
            return product;
        });
        ProductResponse expected = new ProductResponse(
                42L, "MED_TEST", "Test", null, null, ProductType.MEDICATION,
                BigDecimal.TEN, "viên", 25, 5, true, null, true);
        when(inventory.initializeStock(42L, 25, "product:42:initial-stock")).thenReturn(expected);
        CreateProductRequest request = new CreateProductRequest(
                "med_test", "Test", null, null, ProductType.MEDICATION,
                BigDecimal.TEN, "viên", 25, 5);

        ProductResponse response = service.create(request);

        assertThat(response.stockQuantity()).isEqualTo(25);
        verify(inventory).initializeStock(42L, 25, "product:42:initial-stock");
    }
}
