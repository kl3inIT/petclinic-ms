package com.mss301.petclinic.reviews.events;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;
import com.mss301.petclinic.reviews.model.ReviewStatus;
import com.mss301.petclinic.reviews.model.TargetType;

/**
 * Phát ra sau khi review được create thành công. Consumer (v2): mailer-service
 * gửi "review của bạn đã được đăng" + target service (vets/products) bust cache top-rated.
 *
 * <p>Routing key: {@code review.created}.
 *
 * <p>{@code status} là PUBLISHED hoặc PENDING_MODERATION — consumer phân biệt để
 * gửi mail khác nhau ("đăng thành công" vs "đang chờ kiểm duyệt").
 *
 * <p>{@code helpful_count = 0} ở thời điểm create — không cần đưa vào payload.
 */
public record ReviewCreatedEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long reviewId,
        TargetType targetType,
        Long targetId,

        UUID authorId,
        String authorName,

        Integer rating,
        String title,
        ReviewStatus status
) implements DomainEvent {

    public static ReviewCreatedEvent of(Long reviewId, TargetType targetType, Long targetId,
                                         UUID authorId, String authorName,
                                         int rating, String title, ReviewStatus status) {
        return new ReviewCreatedEvent(
                UUID.randomUUID(),
                "review.created",
                Instant.now(),
                "reviews-service",
                reviewId,
                targetType,
                targetId,
                authorId,
                authorName,
                rating,
                title,
                status
        );
    }
}
