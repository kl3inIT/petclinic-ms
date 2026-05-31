package com.mss301.petclinic.visits.repository;

import java.time.Instant;
import java.util.Collection;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.model.VisitStatus;

/**
 * Dùng {@link JpaSpecificationExecutor} cho dynamic filter — tránh JPQL
 * {@code :param IS NULL OR field = :param} (Postgres không infer được type khi null).
 */
public interface VisitRepository extends JpaRepository<Visit, Long>, JpaSpecificationExecutor<Visit> {

    /**
     * Đếm số visit "active" của 1 vet trong 1 khung giờ — enforce capacity rule
     * "tối đa N ca/khung/vet" ở app level. DB UNIQUE không express được "max N rows
     * per group" nên constraint {@code uk_visits_vet_slot} đã bị drop ở changeset
     * {@code 006-relax-vet-slot-unique}; index {@code idx_visits_vet_scheduled} giữ
     * query này nhanh.
     */
    long countByVetIdAndScheduledAtAndStatusIn(
            Long vetId, Instant scheduledAt, Collection<VisitStatus> statuses);
}
