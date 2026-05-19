package com.mss301.petclinic.reviews.dto.res;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.reviews.model.Review;
import com.mss301.petclinic.reviews.model.ReviewStatus;
import com.mss301.petclinic.reviews.model.TargetType;

public record ReviewResponse(
        Long id,
        TargetType targetType,
        Long targetId,
        UUID authorId,
        String authorName,
        Integer rating,
        String title,
        String comment,
        ReviewStatus status,
        Integer helpfulCount,
        Instant createdDate,
        Instant lastModifiedDate
) {
    public static ReviewResponse from(Review r) {
        return new ReviewResponse(
                r.getId(),
                r.getTargetType(),
                r.getTargetId(),
                r.getAuthorId(),
                r.getAuthorName(),
                r.getRating(),
                r.getTitle(),
                r.getComment(),
                r.getStatus(),
                r.getHelpfulCount(),
                r.getCreatedDate(),
                r.getLastModifiedDate()
        );
    }
}
