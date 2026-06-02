package com.mss301.petclinic.products.dto.res;

import java.math.BigDecimal;

import com.mss301.petclinic.products.model.Product;
import com.mss301.petclinic.products.model.ProductType;
import com.mss301.petclinic.products.model.StockStatus;

/** {@code stockStatus} tính động (null cho SERVICE). {@code stockTracked} giúp FE ẩn cột tồn kho. */
public record ProductResponse(
        Long id,
        String code,
        String name,
        String category,
        String description,
        ProductType type,
        BigDecimal unitPrice,
        String unit,
        Integer stockQuantity,
        Integer reorderLevel,
        boolean stockTracked,
        StockStatus stockStatus,
        boolean active
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(), p.getCode(), p.getName(), p.getCategory(), p.getDescription(),
                p.getType(), p.getUnitPrice(), p.getUnit(), p.getStockQuantity(), p.getReorderLevel(),
                p.isStockTracked(), p.stockStatus(), p.isActive());
    }
}
