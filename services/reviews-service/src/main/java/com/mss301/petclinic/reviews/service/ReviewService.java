package com.mss301.petclinic.reviews.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.reviews.dto.req.CreateReviewRequest;
import com.mss301.petclinic.reviews.dto.req.HideReviewRequest;
import com.mss301.petclinic.reviews.dto.req.UpdateReviewRequest;
import com.mss301.petclinic.reviews.dto.req.VoteRequest;
import com.mss301.petclinic.reviews.dto.res.ReviewResponse;
import com.mss301.petclinic.reviews.dto.res.ReviewSummaryResponse;
import com.mss301.petclinic.reviews.model.ReviewStatus;
import com.mss301.petclinic.reviews.model.TargetType;

public interface ReviewService {

    // --- USER ---

    ReviewResponse create(CreateReviewRequest req, UUID authorId, String authorName);

    ReviewResponse findById(Long id);

    /**
     * @param authorFilter nếu non-null → chỉ trả review của author này (dùng cho /me).
     *                     Public list pass null + status=PUBLISHED.
     */
    Page<ReviewResponse> search(TargetType targetType, Long targetId, ReviewStatus status,
                                 UUID authorFilter, Integer minRating, Pageable pageable);

    ReviewResponse update(Long id, UpdateReviewRequest req, UUID currentUserId);

    void softDelete(Long id, UUID currentUserId);

    ReviewResponse vote(Long id, VoteRequest req, UUID currentUserId);

    ReviewSummaryResponse summary(TargetType targetType, Long targetId);

    // --- ADMIN/STAFF ---

    ReviewResponse approve(Long id);

    ReviewResponse hide(Long id, HideReviewRequest req);

    ReviewResponse unhide(Long id);

    void adminDelete(Long id);
}
