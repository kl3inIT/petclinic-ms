package com.mss301.petclinic.vets.controller;

import java.net.URI;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.vets.dto.req.RatingRequest;
import com.mss301.petclinic.vets.dto.res.RatingResponse;
import com.mss301.petclinic.vets.dto.res.RatingSummaryResponse;
import com.mss301.petclinic.vets.service.RatingService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Sub-resource ratings của 1 vet. Method name unique cross-service:
 * {@code listVetRatings}, {@code addVetRating}, {@code deleteVetRating}, {@code getVetRatingsSummary}.
 *
 * <p>{@code top-rated} (cross-vet aggregate) ở {@link TopRatedVetsController} — KHÔNG nested
 * dưới {vetId} vì scope là toàn bộ vets.</p>
 */
@RestController
@RequestMapping("/api/v1/vets/{vetId}/ratings")
@Tag(name = "Vet Ratings", description = "Customer ratings (1-5 stars) of a veterinarian")
public class RatingController {

    private final RatingService service;

    public RatingController(RatingService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
            summary = "List ratings of a vet (paginated)",
            description = "Vet không tồn tại → 404. Use ?page=0&size=20&sort=rateDate,desc. " +
                          "Optional ?year=YYYY lọc rating theo năm của rateDate."
    )
    public Page<RatingResponse> listVetRatings(@PathVariable Long vetId,
                                               @RequestParam(required = false) Integer year,
                                               Pageable pageable) {
        return service.findAllByVetId(vetId, year, pageable);
    }

    @PostMapping
    @Operation(
            summary = "Add or update rating of a vet (UPSERT)",
            description = "score 1-5 (out of range → 400 ProblemDetail). " +
                          "customerName lấy từ JWT claim 'username' (auth-service ký vào access token) " +
                          "— client không thể giả mạo identity. Vet không tồn tại → 404. " +
                          "JWT thiếu claim 'username' → 400 (token version cũ → cần login lại). " +
                          "POST lần thứ 2 của cùng customer trên cùng vet → UPSERT (update rating cũ + " +
                          "đổi rateDate). Unique (vet_id, customer_name) ở DB layer. " +
                          "Body field customerName (nếu có) bị Jackson silently ignore."
    )
    public ResponseEntity<RatingResponse> addVetRating(
            @PathVariable Long vetId,
            @RequestBody @Valid RatingRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String customerName = jwt.getClaimAsString("username");
        if (customerName == null || customerName.isBlank()) {
            // JWT cũ trước Phase F không có claim này. Force user login lại để được token mới.
            throw new BadRequestAlertException(
                    "JWT thiếu claim 'username' — login lại để cấp token mới",
                    "rating", "missing-username");
        }
        RatingResponse created = service.create(vetId, request, customerName);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @DeleteMapping("/{ratingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete rating (rating tồn tại nhưng thuộc vet khác → 404, không leak)")
    public void deleteVetRating(@PathVariable Long vetId, @PathVariable Long ratingId) {
        service.delete(vetId, ratingId);
    }

    @GetMapping("/summary")
    @Operation(
            summary = "Get rating summary of a vet",
            description = "Trả {count, average (null nếu count=0), distribution Map<1..5, count>}. " +
                          "Distribution luôn có đủ 5 key, value=0 nếu không có rating ở score đó."
    )
    public RatingSummaryResponse getVetRatingsSummary(@PathVariable Long vetId) {
        return service.getSummary(vetId);
    }
}
