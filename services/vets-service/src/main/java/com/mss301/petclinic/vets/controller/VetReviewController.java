package com.mss301.petclinic.vets.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.vets.dto.res.EducationResponse;
import com.mss301.petclinic.vets.dto.res.VetPhotoResponse;
import com.mss301.petclinic.vets.service.EducationService;
import com.mss301.petclinic.vets.service.VetPhotoService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Endpoints review queue cho staff/admin — list tất cả thay đổi PENDING từ vet:
 * photo + education. Approve/reject từng item nằm ở VetPhotoController và
 * EducationController (sub-resource theo vetId).
 *
 * <p>Security: chỉ STAFF + ADMIN, khai báo ở {@code vets-service.yml}
 * petclinic.security.endpoints.staff với path {@code /api/v1/vets/reviews/**}.</p>
 */
@RestController
@RequestMapping("/api/v1/vets/reviews")
@Tag(name = "Vet Reviews", description = "Queue duyệt thay đổi từ vet (staff/admin only)")
public class VetReviewController {

    private final VetPhotoService photoService;
    private final EducationService educationService;

    public VetReviewController(VetPhotoService photoService, EducationService educationService) {
        this.photoService = photoService;
        this.educationService = educationService;
    }

    @GetMapping("/photos")
    @Operation(summary = "List photo PENDING của tất cả vet (review queue)")
    public List<VetPhotoResponse> listPendingVetPhotos() {
        return photoService.listPendingPhotos();
    }

    @GetMapping("/educations")
    @Operation(summary = "List education PENDING của tất cả vet (review queue)")
    public List<EducationResponse> listPendingVetEducations() {
        return educationService.listPending();
    }
}
