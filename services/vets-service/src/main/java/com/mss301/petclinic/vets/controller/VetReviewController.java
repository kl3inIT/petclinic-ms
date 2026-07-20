package com.mss301.petclinic.vets.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.vets.dto.res.VetPhotoResponse;
import com.mss301.petclinic.vets.service.VetPhotoService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Endpoints review queue cho admin — list các thay đổi PENDING từ vet.
 * Hiện chỉ còn photo (education đã chuyển sang CRUD trần, không qua duyệt).
 * Approve/reject từng item nằm ở VetPhotoController (sub-resource theo vetId).
 *
 * <p>Security: chỉ ADMIN, khai báo ở {@code vets-service.yml}
 * petclinic.security.endpoints.admin với path {@code /api/v1/vets/reviews/**}.</p>
 */
@RestController
@RequestMapping("/api/v1/vets/reviews")
@Tag(name = "Vet Reviews", description = "Queue duyệt ảnh bác sĩ (admin only)")
public class VetReviewController {

    private final VetPhotoService photoService;

    public VetReviewController(VetPhotoService photoService) {
        this.photoService = photoService;
    }

    @GetMapping("/photos")
    @Operation(summary = "List photo PENDING của tất cả vet (review queue)")
    public List<VetPhotoResponse> listPendingVetPhotos() {
        return photoService.listPendingPhotos();
    }
}
