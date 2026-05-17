package com.mss301.petclinic.visits.repository;

import com.mss301.petclinic.visits.model.Visit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Dùng {@link JpaSpecificationExecutor} cho dynamic filter — tránh JPQL
 * {@code :param IS NULL OR field = :param} (Postgres không infer được type khi null).
 */
public interface VisitRepository extends JpaRepository<Visit, Long>, JpaSpecificationExecutor<Visit> {
}
