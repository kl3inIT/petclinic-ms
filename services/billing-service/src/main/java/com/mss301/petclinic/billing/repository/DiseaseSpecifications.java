package com.mss301.petclinic.billing.repository;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import com.mss301.petclinic.billing.model.Disease;

/**
 * Build {@link Specification} cho query động trên {@link Disease}.
 * Chỉ add predicate khi param non-null.
 */
public final class DiseaseSpecifications {

    private DiseaseSpecifications() {}

    public static Specification<Disease> filter(String q, String category, Boolean active) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                preds.add(cb.or(
                        cb.like(cb.lower(root.get("code")), like),
                        cb.like(cb.lower(root.get("name")), like)));
            }
            if (category != null && !category.isBlank()) {
                preds.add(cb.equal(root.get("category"), category));
            }
            if (active != null) {
                preds.add(cb.equal(root.get("active"), active));
            }
            return cb.and(preds.toArray(new Predicate[0]));
        };
    }
}
