package com.mss301.petclinic.customers.repository;

import java.util.Objects;
import java.util.stream.Stream;

import org.springframework.data.jpa.domain.Specification;

import com.mss301.petclinic.customers.model.Pet;

/**
 * Dynamic filters cho Pet — JpaSpecification thay vì JPQL với
 * {@code (:p IS NULL OR field = :p)} pattern (gotcha #17 fail trên Postgres
 * vì không suy được kiểu NULL).
 */
public final class PetSpecifications {

    private PetSpecifications() {}

    public static Specification<Pet> withFilters(Long ownerId, Long petTypeId, Boolean isActive) {
        // Lọc null trước khi gộp: Spring Data (Boot 4) không còn cho null trong
        // allOf/and ("Other specification must not be null"). allOf(emptyList) =
        // unrestricted (match-all) khi không có filter nào.
        return Specification.allOf(
                Stream.of(ownerIdEq(ownerId), petTypeIdEq(petTypeId), isActiveEq(isActive))
                        .filter(Objects::nonNull)
                        .toList());
    }

    public static Specification<Pet> ownerIdEq(Long ownerId) {
        if (ownerId == null) return null;
        return (root, query, cb) -> cb.equal(root.get("ownerId"), ownerId);
    }

    public static Specification<Pet> petTypeIdEq(Long petTypeId) {
        if (petTypeId == null) return null;
        return (root, query, cb) -> cb.equal(root.get("petTypeId"), petTypeId);
    }

    public static Specification<Pet> isActiveEq(Boolean isActive) {
        if (isActive == null) return null;
        return (root, query, cb) -> cb.equal(root.get("isActive"), isActive);
    }
}
