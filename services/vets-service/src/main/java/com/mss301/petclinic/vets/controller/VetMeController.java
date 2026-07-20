package com.mss301.petclinic.vets.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.vets.dto.req.UpdateVetRequest;
import com.mss301.petclinic.vets.dto.res.BadgeResponse;
import com.mss301.petclinic.vets.dto.res.RatingResponse;
import com.mss301.petclinic.vets.dto.res.RatingSummaryResponse;
import com.mss301.petclinic.vets.dto.res.VetPhotoResponse;
import com.mss301.petclinic.vets.dto.res.VetResponse;
import com.mss301.petclinic.vets.dto.res.WorkScheduleSlotResponse;
import com.mss301.petclinic.vets.service.BadgeService;
import com.mss301.petclinic.vets.service.RatingService;
import com.mss301.petclinic.vets.service.VetPhotoService;
import com.mss301.petclinic.vets.service.VetService;
import com.mss301.petclinic.vets.service.WorkScheduleService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Phase K — endpoint shortcut cho ROLE_VET (bác sĩ tự xem/sửa data của chính mình).
 *
 * <p>Resolve {@code vetId} từ JWT claim {@code vetId} (auth-service đã thêm ở Phase K1).
 * KHÔNG cần resource-level check vì client KHÔNG truyền path param — vetId hoàn toàn từ
 * server-side token. ADMIN có liên kết vet cũng dùng được theo quyền override.
 *
 * <p>Method name unique cross-service: {@code getMyVetProfile}, {@code updateMyVetProfile},
 * {@code listMyWorkSchedule}, {@code listMyRatings}, {@code getMyRatingsSummary}, {@code listMyBadges}.
 */
@RestController
@RequestMapping("/api/v1/vets/me")
@Tag(name = "Vet Me (self-service)", description = "Bác sĩ thú y tự xem/sửa data của chính mình. vetId từ JWT claim.")
public class VetMeController {

    private static final Logger log = LoggerFactory.getLogger(VetMeController.class);

    private final VetService vetService;
    private final WorkScheduleService workScheduleService;
    private final RatingService ratingService;
    private final BadgeService badgeService;
    private final VetPhotoService vetPhotoService;

    public VetMeController(VetService vetService, WorkScheduleService workScheduleService,
                           RatingService ratingService, BadgeService badgeService,
                           VetPhotoService vetPhotoService) {
        this.vetService = vetService;
        this.workScheduleService = workScheduleService;
        this.ratingService = ratingService;
        this.badgeService = badgeService;
        this.vetPhotoService = vetPhotoService;
    }

    /** Đọc vetId từ JWT, throw 400 nếu user chưa link với vet entity. */
    private static Long resolveVetId(Jwt jwt) {
        // NimbusJwtDecoder dùng Jackson — JSON number nhỏ (< 2^31) decode thành Integer,
        // số lớn thành Long. Cast trực tiếp `Long` → ClassCastException ở prod với vetId
        // nhỏ. Nhận qua Number rồi longValue() handle cả Integer/Long/Short/BigInteger.
        Object raw = jwt.getClaim("vetId");
        if (raw == null) {
            // Generic message — không expose DB schema (auth.users + vet_id cột) cho client.
            // CodeRabbit review (PR #11, 2026-05-20): error message KHÔNG được leak internal
            // structure. Detail dành cho admin (xem log server-side).
            // L7 fix: log sub claim để admin grep user nào hit endpoint mà chưa link.
            log.warn("JWT missing 'vetId' claim — sub={}", jwt.getSubject());
            throw new BadRequestAlertException(
                    "Tài khoản chưa được liên kết với hồ sơ bác sĩ. " +
                    "Vui lòng liên hệ quản trị viên.",
                    "vet-me", "missing-vet-id");
        }
        if (!(raw instanceof Number n)) {
            log.warn("JWT 'vetId' claim is non-numeric — sub={}, claimType={}",
                    jwt.getSubject(), raw.getClass().getSimpleName());
            throw new BadRequestAlertException(
                    "Claim 'vetId' phải là số.",
                    "vet-me", "invalid-vet-id-type");
        }
        return n.longValue();
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

    @GetMapping("/photo")
    @Operation(
            summary = "Avatar của vet đang login (metadata + presigned URL)",
            description = "Trả 404 nếu vet chưa upload photo. vetId resolve từ JWT claim."
    )
    public VetPhotoResponse getMyVetPhoto(@AuthenticationPrincipal Jwt jwt) {
        return vetPhotoService.getPhoto(resolveVetId(jwt));
    }

    @PutMapping(value = "/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Upload/replace avatar của vet đang login (idempotent)",
            description = "Multipart field 'file'. Max 10MB. Content-type: image/jpeg|png|webp. " +
                          "Mỗi lần đổi ảnh reset status PENDING — chờ ADMIN duyệt mới hiển thị public."
    )
    public VetPhotoResponse uploadMyVetPhoto(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("file") MultipartFile file
    ) {
        return vetPhotoService.uploadPhoto(resolveVetId(jwt), file);
    }

    @DeleteMapping("/photo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Xóa avatar của vet đang login")
    public void deleteMyVetPhoto(@AuthenticationPrincipal Jwt jwt) {
        vetPhotoService.deletePhoto(resolveVetId(jwt));
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
