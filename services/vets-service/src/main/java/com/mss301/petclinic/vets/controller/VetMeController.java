package com.mss301.petclinic.vets.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.vets.dto.req.UpdateVetRequest;
import com.mss301.petclinic.vets.dto.res.BadgeResponse;
import com.mss301.petclinic.vets.dto.res.RatingResponse;
import com.mss301.petclinic.vets.dto.res.RatingSummaryResponse;
import com.mss301.petclinic.vets.dto.res.VetResponse;
import com.mss301.petclinic.vets.dto.res.WorkScheduleSlotResponse;
import com.mss301.petclinic.vets.service.BadgeService;
import com.mss301.petclinic.vets.service.RatingService;
import com.mss301.petclinic.vets.service.VetService;
import com.mss301.petclinic.vets.service.WorkScheduleService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Phase K — endpoint shortcut cho ROLE_VET (bác sĩ tự xem/sửa data của chính mình).
 *
 * <p>Resolve {@code vetId} từ JWT claim {@code vetId} (auth-service đã thêm ở Phase K1).
 * KHÔNG cần resource-level check vì client KHÔNG truyền path param — vetId hoàn toàn từ
 * server-side token. STAFF/ADMIN login dạng vet (admin link account → vet) cũng dùng được.
 *
 * <p>Method name unique cross-service: {@code getMyVetProfile}, {@code updateMyVetProfile},
 * {@code listMyWorkSchedule}, {@code listMyRatings}, {@code getMyRatingsSummary}, {@code listMyBadges}.
 */
@RestController
@RequestMapping("/api/v1/vets/me")
@Tag(name = "Vet Me (self-service)", description = "Bác sĩ thú y tự xem/sửa data của chính mình. vetId từ JWT claim.")
public class VetMeController {

    private final VetService vetService;
    private final WorkScheduleService workScheduleService;
    private final RatingService ratingService;
    private final BadgeService badgeService;

    public VetMeController(VetService vetService, WorkScheduleService workScheduleService,
                           RatingService ratingService, BadgeService badgeService) {
        this.vetService = vetService;
        this.workScheduleService = workScheduleService;
        this.ratingService = ratingService;
        this.badgeService = badgeService;
    }

    /** Đọc vetId từ JWT, throw 400 nếu user chưa link với vet entity. */
    private static Long resolveVetId(Jwt jwt) {
        Long vetId = jwt.getClaim("vetId");
        if (vetId == null) {
            throw new BadRequestAlertException(
                    "Token không có claim 'vetId' — account chưa được link với vet entity. " +
                    "Admin cần update auth.users.vet_id rồi user login lại.",
                    "vet-me", "missing-vet-id");
        }
        return vetId;
    }

    @GetMapping
    @Operation(summary = "Profile của vet đang login")
    public VetResponse getMyVetProfile(@AuthenticationPrincipal Jwt jwt) {
        return vetService.findById(resolveVetId(jwt));
    }

    @PatchMapping
    @Operation(summary = "Sửa profile của vet đang login (PATCH partial)")
    public VetResponse updateMyVetProfile(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid UpdateVetRequest request
    ) {
        return vetService.update(resolveVetId(jwt), request);
    }

    @GetMapping("/work-schedule")
    @Operation(summary = "Lịch trực của vet đang login")
    public List<WorkScheduleSlotResponse> listMyWorkSchedule(@AuthenticationPrincipal Jwt jwt) {
        return workScheduleService.findAllByVetId(resolveVetId(jwt));
    }

    @GetMapping("/ratings")
    @Operation(summary = "Ratings customer chấm cho vet đang login (paginated)")
    public Page<RatingResponse> listMyRatings(@AuthenticationPrincipal Jwt jwt, Pageable pageable) {
        return ratingService.findAllByVetId(resolveVetId(jwt), pageable);
    }

    @GetMapping("/ratings/summary")
    @Operation(summary = "Summary ratings của vet đang login (count, average, distribution)")
    public RatingSummaryResponse getMyRatingsSummary(@AuthenticationPrincipal Jwt jwt) {
        return ratingService.getSummary(resolveVetId(jwt));
    }

    @GetMapping("/badges")
    @Operation(summary = "Badges của vet đang login (paginated)")
    public Page<BadgeResponse> listMyBadges(@AuthenticationPrincipal Jwt jwt, Pageable pageable) {
        return badgeService.findAllByVetId(resolveVetId(jwt), pageable);
    }
}
