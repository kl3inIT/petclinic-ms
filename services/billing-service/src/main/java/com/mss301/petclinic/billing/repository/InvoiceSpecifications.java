package com.mss301.petclinic.billing.repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import com.mss301.petclinic.billing.model.Invoice;
import com.mss301.petclinic.billing.model.InvoiceStatus;

/**
 * Build {@link Specification} cho query động trên {@link Invoice}.
 * Chỉ add predicate khi param non-null — tránh Postgres untyped-null bug (gotcha #17).
 */
public final class InvoiceSpecifications {

    private InvoiceSpecifications() {}

    public static Specification<Invoice> filter(UUID customerUserId, InvoiceStatus status,
                                                Instant from, Instant to) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (customerUserId != null) preds.add(cb.equal(root.get("customerUserId"), customerUserId));
            if (status != null) preds.add(cb.equal(root.get("status"), status));
            if (from != null) preds.add(cb.greaterThanOrEqualTo(root.get("issuedAt"), from));
            if (to != null) preds.add(cb.lessThan(root.get("issuedAt"), to));
            return cb.and(preds.toArray(new Predicate[0]));
        };
    }
}
