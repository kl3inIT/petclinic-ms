package com.mss301.petclinic.vets.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import com.mss301.petclinic.vets.model.Specialty;
import com.mss301.petclinic.vets.model.Vet;

/**
 * Build {@link Specification} cho query động — chỉ add predicate khi param != null.
 * Theo pattern visits-service/VisitSpecifications. Tránh JPQL
 * {@code (:param IS NULL OR field = :param)} fail trên Postgres untyped-null.
 */
public final class VetSpecifications {

    private VetSpecifications() {}

    public static Specification<Vet> filter(String lastName, Long specialtyId, Boolean active) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();

            if (lastName != null && !lastName.isBlank()) {
                // Locale.ROOT: deterministic lowercasing across deployments
                // (default locale như tr-TR đổi 'I' → 'ı' thay vì 'i' → bug filter).
                preds.add(cb.like(cb.lower(root.get("lastName")), "%" + lastName.toLowerCase(Locale.ROOT) + "%"));
            }
            if (specialtyId != null) {
                Join<Vet, Specialty> spec = root.join("specialties", JoinType.INNER);
                preds.add(cb.equal(spec.get("id"), specialtyId));
                // Vet có nhiều specialty → JOIN có thể duplicate vet row. distinct ngăn count sai.
                query.distinct(true);
            }
            if (active != null) {
                preds.add(cb.equal(root.get("active"), active));
            }
            return cb.and(preds.toArray(new Predicate[0]));
        };
    }
}
