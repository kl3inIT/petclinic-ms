package com.mss301.petclinic.reviews.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.reviews.model.ReviewVote;
import com.mss301.petclinic.reviews.model.VoteType;

public interface ReviewVoteRepository extends JpaRepository<ReviewVote, Long> {

    /** Upsert lookup trong service.vote() — tìm vote hiện tại của user trên review. */
    Optional<ReviewVote> findByReviewIdAndUserId(Long reviewId, UUID userId);

    /** Recompute denorm {@code Review.helpful_count} sau khi vote thay đổi. */
    long countByReviewIdAndVoteType(Long reviewId, VoteType voteType);
}
