package com.mss301.petclinic.reviews.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import com.mss301.petclinic.reviews.model.Review;
import com.mss301.petclinic.reviews.model.ReviewStatus;
import com.mss301.petclinic.reviews.model.TargetType;

/**
 * Build {@link Specification} cho query động trên {@link Review}.
 * Chỉ add predicate khi param non-null — tránh Postgres untyped-null bug (gotcha #17).
 */
public final class ReviewSpecifications {

    private ReviewSpecifications() {}

    public static Specification<Review> filter(TargetType targetType, UUID targetId,
                                                ReviewStatus status, UUID authorId,
                                                Integer minRating) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (targetType != null) preds.add(cb.equal(root.get("targetType"), targetType));
            if (targetId   != null) preds.add(cb.equal(root.get("targetId"), targetId));
            if (status     != null) preds.add(cb.equal(root.get("status"), status));
            if (authorId   != null) preds.add(cb.equal(root.get("authorId"), authorId));
            if (minRating  != null) preds.add(cb.greaterThanOrEqualTo(root.get("rating"), minRating));
            return cb.and(preds.toArray(new Predicate[0]));
        };
    }
}
