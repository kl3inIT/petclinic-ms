package com.mss301.petclinic.products.repository;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import com.mss301.petclinic.products.model.Product;
import com.mss301.petclinic.products.model.ProductType;

/**
 * Build {@link Specification} cho query động trên {@link Product}.
 * Chỉ add predicate khi param non-null (tránh bug Postgres "could not determine data type
 * of parameter" của pattern JPQL {@code :p IS NULL OR field = :p}, gotcha #17).
 */
public final class ProductSpecifications {

    private ProductSpecifications() {}

    public static Specification<Product> filter(String q, ProductType type, Boolean active, Boolean lowStock) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                preds.add(cb.or(
                        cb.like(cb.lower(root.get("code")), like),
                        cb.like(cb.lower(root.get("name")), like)));
            }
            if (type != null) {
                preds.add(cb.equal(root.get("type"), type));
            }
            if (active != null) {
                preds.add(cb.equal(root.get("active"), active));
            }
            // Sắp hết hàng: chỉ mục quản lý tồn (stock_quantity NOT NULL) + stock ≤ reorderLevel.
            if (Boolean.TRUE.equals(lowStock)) {
                preds.add(cb.isNotNull(root.get("stockQuantity")));
                preds.add(cb.lessThanOrEqualTo(root.get("stockQuantity"), root.get("reorderLevel")));
            }
            return cb.and(preds.toArray(new Predicate[0]));
        };
    }
}
