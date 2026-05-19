package com.mss301.petclinic.reviews.controller;

import java.net.URI;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.mss301.petclinic.reviews.dto.req.CreateReviewRequest;
import com.mss301.petclinic.reviews.dto.req.UpdateReviewRequest;
import com.mss301.petclinic.reviews.dto.req.VoteRequest;
import com.mss301.petclinic.reviews.dto.res.ReviewResponse;
import com.mss301.petclinic.reviews.dto.res.ReviewSummaryResponse;
import com.mss301.petclinic.reviews.model.ReviewStatus;
import com.mss301.petclinic.reviews.model.TargetType;
import com.mss301.petclinic.reviews.service.ReviewService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Reviews API (USER + public). Authorization rules:
 * <ul>
 *   <li>Role + URL → khai báo ở {@link com.mss301.petclinic.reviews.config.ReviewsSecurityConfig}</li>
 *   <li>Ownership / edit-window → ở Service layer (lookup findByIdAndAuthorId → 404 path-tamper)</li>
 * </ul>
 *
 * <p>Method name UNIQUE cross-service cho OpenAPI aggregation (gotcha #23):
 * createReview / searchReviews / getReview / updateReview / deleteReview / voteReview /
 * getReviewsSummary / listMyReviews.
 */
@RestController
@RequestMapping("/api/v1/reviews")
@Tag(name = "Reviews", description = "Polymorphic review (VET/PRODUCT/VISIT) + vote + moderation queue")
public class ReviewController {

    private final ReviewService service;

    public ReviewController(ReviewService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(summary = "USER tạo review — eligibility check qua visits-service (VET/VISIT)")
    public ResponseEntity<ReviewResponse> createReview(@Valid @RequestBody CreateReviewRequest request,
                                                        @AuthenticationPrincipal Jwt jwt) {
        ReviewResponse created = service.create(request, currentUserId(jwt), currentUsername(jwt));
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping
    @Operation(summary = "List reviews — public, default status=PUBLISHED nếu không filter")
    public Page<ReviewResponse> searchReviews(
            @RequestParam(required = false) TargetType targetType,
            @RequestParam(required = false) Long targetId,
            @RequestParam(required = false, defaultValue = "PUBLISHED") ReviewStatus status,
            @RequestParam(required = false) Integer minRating,
            Pageable pageable
    ) {
        return service.search(targetType, targetId, status, null, minRating, pageable);
    }

    @GetMapping("/me")
    @Operation(summary = "List review của chính user — mọi status (PUBLISHED, PENDING, HIDDEN)")
    public Page<ReviewResponse> listMyReviews(
            @RequestParam(required = false) TargetType targetType,
            @RequestParam(required = false) Long targetId,
            @RequestParam(required = false) ReviewStatus status,
            Pageable pageable,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return service.search(targetType, targetId, status, currentUserId(jwt), null, pageable);
    }

    @GetMapping("/summary")
    @Operation(summary = "Aggregate stats cho 1 target — count + avg + distribution 1..5")
    public ReviewSummaryResponse getReviewsSummary(
            @RequestParam TargetType targetType,
            @RequestParam Long targetId
    ) {
        return service.summary(targetType, targetId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get review detail")
    public ReviewResponse getReview(@PathVariable Long id) {
        return service.findById(id);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "USER chỉnh sửa review của mình — trong 7 ngày kể từ tạo")
    public ReviewResponse updateReview(@PathVariable Long id,
                                        @Valid @RequestBody UpdateReviewRequest req,
                                        @AuthenticationPrincipal Jwt jwt) {
        return service.update(id, req, currentUserId(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "USER soft-delete review của mình — status → DELETED")
    public void deleteReview(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        service.softDelete(id, currentUserId(jwt));
    }

    @PostMapping("/{id}/vote")
    @Operation(summary = "Vote HELPFUL / NOT_HELPFUL — author không vote chính review của mình")
    public ReviewResponse voteReview(@PathVariable Long id,
                                      @Valid @RequestBody VoteRequest req,
                                      @AuthenticationPrincipal Jwt jwt) {
        return service.vote(id, req, currentUserId(jwt));
    }

    // --- helpers ---

    private static UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    private static String currentUsername(Jwt jwt) {
        String name = jwt.getClaimAsString("username");
        // Fallback: nếu JWT không có claim "username" thì dùng sub (UUID string).
        return name != null && !name.isBlank() ? name : jwt.getSubject();
    }
}
