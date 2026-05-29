package com.mss301.petclinic.visits.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mss301.petclinic.visits.model.Visit;

/**
 * Dùng {@link JpaSpecificationExecutor} cho dynamic filter — tránh JPQL
 * {@code :param IS NULL OR field = :param} (Postgres không infer được type khi null).
 */
public interface VisitRepository extends JpaRepository<Visit, Long>, JpaSpecificationExecutor<Visit> {

    /**
     * Đếm số visit ACTIVE (SCHEDULED hoặc IN_PROGRESS) tại 1 slot (vet, scheduledAt).
     * CANCELLED và COMPLETED không tính — slot đã giải phóng hoặc đã đóng.
     * Dùng để enforce SLOT_CAPACITY=2 trong VisitServiceImpl.book().
     */
    @Query("""
            SELECT COUNT(v) FROM Visit v
            WHERE v.vetId = :vetId
              AND v.scheduledAt = :scheduledAt
              AND v.status IN (com.mss301.petclinic.visits.model.VisitStatus.SCHEDULED,
                               com.mss301.petclinic.visits.model.VisitStatus.IN_PROGRESS)
            """)
    long countActiveByVetIdAndScheduledAt(@Param("vetId") Long vetId,
                                          @Param("scheduledAt") Instant scheduledAt);

    /**
     * Lấy danh sách visit ACTIVE của vet trong khoảng [from, to). Dùng cho endpoint
     * availability để FE tính remaining slots per work-hour cho 1 ngày.
     */
    @Query("""
            SELECT v FROM Visit v
            WHERE v.vetId = :vetId
              AND v.scheduledAt >= :from
              AND v.scheduledAt < :to
              AND v.status IN (com.mss301.petclinic.visits.model.VisitStatus.SCHEDULED,
                               com.mss301.petclinic.visits.model.VisitStatus.IN_PROGRESS)
            """)
    List<Visit> findActiveByVetIdAndScheduledAtRange(@Param("vetId") Long vetId,
                                                     @Param("from") Instant from,
                                                     @Param("to") Instant to);
}
