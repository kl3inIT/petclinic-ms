package com.mss301.petclinic.reviews.controller;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.reviews.dto.req.HideReviewRequest;
import com.mss301.petclinic.reviews.dto.res.ReviewResponse;
import com.mss301.petclinic.reviews.model.ReviewStatus;
import com.mss301.petclinic.reviews.service.ReviewService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Reviews moderation API (STAFF/ADMIN). Tách path prefix {@code /admin/reviews} để
 * SecurityConfig route role-based dễ hơn.
 *
 * <p>Method name UNIQUE cross-service (gotcha #23):
 * listPendingReviews / approveReview / hideReview / unhideReview / adminDeleteReview.
 */
@RestController
@RequestMapping("/api/v1/admin/reviews")
@Tag(name = "Reviews Moderation", description = "STAFF/ADMIN moderate review queue")
public class ReviewModerationController {

    private final ReviewService service;

    public ReviewModerationController(ReviewService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List queue moderation — default status=PENDING_MODERATION")
    public Page<ReviewResponse> listPendingReviews(
            @RequestParam(required = false, defaultValue = "PENDING_MODERATION") ReviewStatus status,
            Pageable pageable
    ) {
        return service.search(null, null, status, null, null, pageable);
    }

    @PatchMapping("/{id}/approve")
    @Operation(summary = "Duyệt PENDING_MODERATION hoặc HIDDEN → PUBLISHED")
    public ReviewResponse approveReview(@PathVariable Long id) {
        return service.approve(id);
    }

    @PatchMapping("/{id}/hide")
    @Operation(summary = "Ẩn review (kèm reason audit) — status → HIDDEN")
    public ReviewResponse hideReview(@PathVariable Long id,
                                      @Valid @RequestBody HideReviewRequest req) {
        return service.hide(id, req);
    }

    @PatchMapping("/{id}/unhide")
    @Operation(summary = "Khôi phục HIDDEN → PUBLISHED (ADMIN only)")
    public ReviewResponse unhideReview(@PathVariable Long id) {
        return service.unhide(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Hard moderate — soft-delete row (ADMIN only)")
    public void adminDeleteReview(@PathVariable Long id) {
        service.adminDelete(id);
    }
}
