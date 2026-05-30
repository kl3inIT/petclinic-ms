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

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * 1 vote = 1 user / 1 review. User có thể flip giữa HELPFUL ↔ NOT_HELPFUL.
 * Upsert (insert hoặc update) trong {@code ReviewServiceImpl.vote()}.
 *
 * <p>NOT_HELPFUL chỉ lưu để chống re-vote, KHÔNG hiển thị count cho user (anti-griefing).
 */
@Entity
@Table(name = "review_votes",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_review_votes_user",
                columnNames = {"review_id", "user_id"}))
public class ReviewVote extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "review_id", nullable = false)
    private Long reviewId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "vote_type", nullable = false, length = 15)
    private VoteType voteType;

    protected ReviewVote() {
        // JPA
    }

    private ReviewVote(Long reviewId, UUID userId, VoteType voteType) {
        this.reviewId = reviewId;
        this.userId = userId;
        this.voteType = voteType;
    }

    public static ReviewVote of(Long reviewId, UUID userId, VoteType voteType) {
        return new ReviewVote(reviewId, userId, voteType);
    }

    /** Flip vote (HELPFUL ↔ NOT_HELPFUL). */
    public void changeVote(VoteType newVoteType) {
        this.voteType = newVoteType;
    }

    // --- getters ---

    public Long getId() { return id; }
    public Long getReviewId() { return reviewId; }
    public UUID getUserId() { return userId; }
    public VoteType getVoteType() { return voteType; }
}
