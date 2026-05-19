package com.mss301.petclinic.reviews.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mss301.petclinic.reviews.model.Review;
import com.mss301.petclinic.reviews.model.ReviewStatus;
import com.mss301.petclinic.reviews.model.TargetType;

/**
 * Dùng {@link JpaSpecificationExecutor} cho dynamic filter — tránh JPQL
 * {@code :param IS NULL OR field = :param} (Postgres không infer được type khi null — gotcha #17).
 */
public interface ReviewRepository extends JpaRepository<Review, Long>, JpaSpecificationExecutor<Review> {

    /** Ownership lookup: dùng cho USER PATCH/DELETE → 404 nếu không phải của họ (path-tamper). */
    Optional<Review> findByIdAndAuthorId(Long id, UUID authorId);

    /** Pre-check UNIQUE (author_id, target_type, target_id) trước save. */
    boolean existsByAuthorIdAndTargetTypeAndTargetId(UUID authorId, TargetType targetType, UUID targetId);

    /**
     * Aggregate cho {@code GET /reviews/summary}:
     * trả về [rating (Integer), count (Long)] cho từng rating 1..5.
     */
    @Query("""
            SELECT r.rating, COUNT(r)
            FROM Review r
            WHERE r.targetType = :targetType
              AND r.targetId   = :targetId
              AND r.status     = :status
            GROUP BY r.rating
            """)
    java.util.List<Object[]> aggregateRatingDistribution(
            @Param("targetType") TargetType targetType,
            @Param("targetId") UUID targetId,
            @Param("status") ReviewStatus status);
}
