package com.mss301.petclinic.visits.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.visits.dto.req.CreatePrescriptionRequest;
import com.mss301.petclinic.visits.dto.res.PrescriptionResponse;
import com.mss301.petclinic.visits.service.PrescriptionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Đơn thuốc của một visit. Authorization:
 * <ul>
 *   <li>POST — chỉ VET (rule custom-roles ở {@code visits-service.yml}); service kiểm tra
 *       thêm vet phụ trách đúng visit.</li>
 *   <li>GET / GET pdf — chủ nuôi của visit hoặc VET/STAFF/ADMIN, qua
 *       {@code @PreAuthorize @visitSecurity.canView} (reach cấp ở VisitsSecurityConfig).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/visits/{visitId}/prescription")
@Tag(name = "Prescriptions", description = "Bác sĩ kê đơn thuốc cho lần khám + xuất PDF")
public class PrescriptionController {

    private final PrescriptionService service;

    public PrescriptionController(PrescriptionService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Bác sĩ phụ trách kê đơn thuốc cho visit (sinh PDF)")
    public PrescriptionResponse createPrescription(@PathVariable Long visitId,
                                                   @Valid @RequestBody CreatePrescriptionRequest request,
                                                   @AuthenticationPrincipal Jwt jwt) {
        boolean isAdmin = hasRole(jwt, "ADMIN");
        Long vetId = extractVetId(jwt);
        if (!isAdmin && vetId == null) {
            throw new BadRequestAlertException(
                    "Tài khoản chưa được liên kết với hồ sơ bác sĩ.",
                    "Prescription", "missing-vet-id");
        }
        return service.create(visitId, request, vetId, isAdmin);
    }

    @GetMapping
    @Operation(summary = "Xem đơn thuốc của visit (metadata + danh sách thuốc)")
    @PreAuthorize("@visitSecurity.canView(#visitId, authentication)")
    public PrescriptionResponse getVisitPrescription(@PathVariable Long visitId) {
        return service.getByVisitId(visitId);
    }

    @GetMapping("/pdf")
    @Operation(summary = "Tải PDF đơn thuốc của visit")
    @PreAuthorize("@visitSecurity.canView(#visitId, authentication)")
    public ResponseEntity<byte[]> downloadVisitPrescriptionPdf(@PathVariable Long visitId) {
        PrescriptionService.PrescriptionPdf pdf = service.downloadPdf(visitId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + pdf.filename() + "\"")
                .body(pdf.content());
    }

    // --- helpers ---

    private static boolean hasRole(Jwt jwt, String role) {
        List<String> roles = jwt.getClaimAsStringList("roles");
        return roles != null && roles.contains(role);
    }

    /** vetId từ JWT claim — null nếu account chưa link vet. Number để tránh Integer/Long cast. */
    private static Long extractVetId(Jwt jwt) {
        Object raw = jwt.getClaim("vetId");
        return raw instanceof Number n ? n.longValue() : null;
    }
}
