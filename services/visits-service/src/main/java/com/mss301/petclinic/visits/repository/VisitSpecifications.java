package com.mss301.petclinic.visits.repository;

import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.model.VisitStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Build {@link Specification} cho query động — chỉ add predicate khi param != null.
 * Tránh Postgres untyped-null bug khi mọi param đều null.
 */
public final class VisitSpecifications {

    private VisitSpecifications() {}

    public static Specification<Visit> filter(UUID customerFilter, Long vetId, Long petId,
                                              VisitStatus status, Instant from, Instant to) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> preds = new ArrayList<>();
            if (customerFilter != null) preds.add(cb.equal(root.get("customerUserId"), customerFilter));
            if (vetId != null)          preds.add(cb.equal(root.get("vetId"), vetId));
            if (petId != null)          preds.add(cb.equal(root.get("petId"), petId));
            if (status != null)         preds.add(cb.equal(root.get("status"), status));
            if (from != null)           preds.add(cb.greaterThanOrEqualTo(root.get("scheduledAt"), from));
            if (to != null)             preds.add(cb.lessThan(root.get("scheduledAt"), to));
            return cb.and(preds.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
