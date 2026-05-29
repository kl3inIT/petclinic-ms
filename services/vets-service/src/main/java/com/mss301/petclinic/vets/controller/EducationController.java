package com.mss301.petclinic.vets.controller;

import java.net.URI;
import java.util.Map;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.mss301.petclinic.vets.dto.req.EducationRequest;
import com.mss301.petclinic.vets.dto.req.UpdateEducationRequest;
import com.mss301.petclinic.vets.dto.res.EducationResponse;
import com.mss301.petclinic.vets.service.EducationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Sub-resource REST của Vet — education (bằng cấp / đào tạo). Method name unique cross-service
 * (gateway aggregate OpenAPI → orval sinh hook): {@code listVetEducations}, {@code getVetEducation},
 * {@code addVetEducation}, {@code updateVetEducation}, {@code deleteVetEducation}.
 */
@RestController
@RequestMapping("/api/v1/vets/{vetId}/educations")
@Tag(name = "Vet Educations", description = "Education history of a veterinarian")
public class EducationController {

    private final EducationService service;

    public EducationController(EducationService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
            summary = "List educations of a vet (paginated)",
            description = "Vet không tồn tại → 404. Use ?page=0&size=20&sort=startDate,desc."
    )
    public Page<EducationResponse> listVetEducations(@PathVariable Long vetId, Pageable pageable) {
        return service.findAllByVetId(vetId, pageable);
    }

    @GetMapping("/{educationId}")
    @Operation(
            summary = "Get one education of a vet",
            description = "Trả 404 nếu vet không tồn tại, hoặc education không tồn tại, " +
                          "hoặc education tồn tại nhưng thuộc vet khác (không leak existence)."
    )
    public EducationResponse getVetEducation(@PathVariable Long vetId, @PathVariable Long educationId) {
        return service.findByVetIdAndId(vetId, educationId);
    }

    @PostMapping
    @Operation(
            summary = "Add education to a vet",
            description = "Vet không tồn tại → 404. endDate < startDate → 400 error.date-invalid. " +
                          "endDate null = đang học."
    )
    public ResponseEntity<EducationResponse> addVetEducation(
            @PathVariable Long vetId,
            @RequestBody @Valid EducationRequest request
    ) {
        EducationResponse created = service.create(vetId, request);
        // Location: chuẩn REST cho 201 — point đến resource vừa tạo.
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PatchMapping("/{educationId}")
    @Operation(
            summary = "Update education — partial (null fields = không đổi)",
            description = "schoolName/degree blank → 400. " +
                          "fieldOfStudy = \"\" để clear. " +
                          "Date sau khi merge: endDate < startDate → 400 error.date-invalid. " +
                          "Để clear endDate hiện không support qua PATCH — dùng DELETE."
    )
    public EducationResponse updateVetEducation(
            @PathVariable Long vetId,
            @PathVariable Long educationId,
            @RequestBody UpdateEducationRequest request
    ) {
        return service.update(vetId, educationId, request);
    }

    @DeleteMapping("/{educationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete education")
    public void deleteVetEducation(@PathVariable Long vetId, @PathVariable Long educationId) {
        service.delete(vetId, educationId);
    }

    @PostMapping("/{educationId}/approve")
    @Operation(summary = "Approve education — STAFF/ADMIN only")
    public EducationResponse approveVetEducation(@PathVariable Long vetId,
                                                  @PathVariable Long educationId,
                                                  @AuthenticationPrincipal Jwt jwt) {
        return service.approve(vetId, educationId, jwt.getClaimAsString("username"));
    }

    @PostMapping("/{educationId}/reject")
    @Operation(
            summary = "Reject education — STAFF/ADMIN only",
            description = "Body: { reason: '...' }"
    )
    public EducationResponse rejectVetEducation(@PathVariable Long vetId,
                                                 @PathVariable Long educationId,
                                                 @RequestBody Map<String, String> body,
                                                 @AuthenticationPrincipal Jwt jwt) {
        String reason = body == null ? null : body.get("reason");
        return service.reject(vetId, educationId, jwt.getClaimAsString("username"), reason);
    }
}
