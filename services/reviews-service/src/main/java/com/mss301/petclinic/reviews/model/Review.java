package com.mss301.petclinic.reviews.model;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;
import com.mss301.petclinic.reviews.exception.IllegalReviewTransitionException;

/**
 * Polymorphic review aggregate. Target có thể là VET / PRODUCT / VISIT — phân biệt qua
 * {@link #targetType} + {@link #targetId} (KHÔNG FK constraint DB-level — 3 schema khác nhau).
 *
 * <h4>Identity</h4>
 * <p>Surrogate PK ({@code id}). Business identity = (authorId, targetType, targetId) —
 * enforce qua UNIQUE constraint Liquibase + lookup `findByAuthorIdAndTargetTypeAndTargetId`.
 *
 * <h4>Author name</h4>
 * <p>{@link #authorName} = snapshot từ JWT claim {@code username} lúc create — chống user
 * đổi profile làm sai lệch review cũ. Adopt từ Champlain vet-Rating pattern.
 *
 * <h4>Helpful count</h4>
 * <p>{@link #helpfulCount} = denorm count của {@code ReviewVote WHERE vote_type=HELPFUL}.
 * Recompute trong {@code ReviewServiceImpl.vote()} sau upsert. NOT_HELPFUL chỉ lưu để chống
 * re-vote, không hiển thị (anti-griefing).
 */
@Entity
@Table(name = "reviews",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_reviews_author_target",
                columnNames = {"author_id", "target_type", "target_id"}))
public class Review extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private TargetType targetType;

    /** ID của Vet/Product/Visit. KHÔNG FK — orphan cleanup là job định kỳ (v2). */
    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    /** JWT sub UUID. */
    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    /** Snapshot từ JWT claim `username` lúc create. */
    @Column(name = "author_name", nullable = false, length = 120)
    private String authorName;

    @Column(nullable = false)
    private Integer rating;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReviewStatus status;

    @Column(name = "helpful_count", nullable = false)
    private Integer helpfulCount;

    @Version
    private Long version;

    protected Review() {
        // JPA
    }

    private Review(TargetType targetType, UUID targetId, UUID authorId, String authorName,
                   int rating, String title, String comment, ReviewStatus initialStatus) {
        this.targetType = targetType;
        this.targetId = targetId;
        this.authorId = authorId;
        this.authorName = authorName;
        this.rating = rating;
        this.title = title;
        this.comment = comment;
        this.status = initialStatus;
        this.helpfulCount = 0;
    }

    /**
     * Factory. Caller (Service) tự quyết {@code initialStatus} = PUBLISHED hoặc
     * PENDING_MODERATION dựa trên kết quả {@code ContentModerator}.
     */
    public static Review create(TargetType targetType, UUID targetId,
                                UUID authorId, String authorName,
                                int rating, String title, String comment,
                                ReviewStatus initialStatus) {
        return new Review(targetType, targetId, authorId, authorName,
                rating, title, comment, initialStatus);
    }

    /** USER edit — caller kiểm tra ownership + edit-window TRƯỚC khi gọi. */
    public void edit(int rating, String title, String comment, ReviewStatus statusAfterModeration) {
        this.rating = rating;
        this.title = title;
        this.comment = comment;
        // Edit có thể re-trigger moderation (vd: comment mới chứa profanity).
        // Service lo logic, entity chỉ áp dụng.
        this.status = statusAfterModeration;
    }

    public void approve() {
        transitionTo(ReviewStatus.PUBLISHED);
    }

    public void hide() {
        transitionTo(ReviewStatus.HIDDEN);
    }

    public void softDelete() {
        transitionTo(ReviewStatus.DELETED);
    }

    public void incrementHelpful() {
        this.helpfulCount++;
    }

    public void decrementHelpful() {
        if (this.helpfulCount > 0) {
            this.helpfulCount--;
        }
    }

    public void setHelpfulCount(int count) {
        // Service recompute từ count(*) query — bypass arithmetic helpers.
        this.helpfulCount = Math.max(0, count);
    }

    private void transitionTo(ReviewStatus next) {
        if (!status.canTransitionTo(next)) {
            throw new IllegalReviewTransitionException(status, next);
        }
        this.status = next;
    }

    // --- getters only ---

    public Long getId() { return id; }
    public TargetType getTargetType() { return targetType; }
    public UUID getTargetId() { return targetId; }
    public UUID getAuthorId() { return authorId; }
    public String getAuthorName() { return authorName; }
    public Integer getRating() { return rating; }
    public String getTitle() { return title; }
    public String getComment() { return comment; }
    public ReviewStatus getStatus() { return status; }
    public Integer getHelpfulCount() { return helpfulCount; }
    public Long getVersion() { return version; }
}
