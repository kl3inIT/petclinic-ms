package com.mss301.petclinic.vets.controller;

import java.net.URI;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.mss301.petclinic.vets.dto.req.BadgeRequest;
import com.mss301.petclinic.vets.dto.res.BadgeResponse;
import com.mss301.petclinic.vets.service.BadgeService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Sub-resource badges của 1 vet. Method name unique cross-service:
 * {@code listVetBadges}, {@code addVetBadge}, {@code deleteVetBadge}.
 * Không có PATCH — badge immutable sau khi trao (theo logic recognition).
 */
@RestController
@RequestMapping("/api/v1/vets/{vetId}/badges")
@Tag(name = "Vet Badges", description = "Achievement badges của veterinarian")
public class BadgeController {

    private final BadgeService service;

    public BadgeController(BadgeService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
            summary = "List badges of a vet (paginated)",
            description = "Vet không tồn tại → 404. Use ?page=0&size=20&sort=awardedDate,desc."
    )
    public Page<BadgeResponse> listVetBadges(@PathVariable Long vetId, Pageable pageable) {
        return service.findAllByVetId(vetId, pageable);
    }

    @PostMapping
    @Operation(
            summary = "Add badge to a vet",
            description = "title từ enum BadgeTitle (ROOKIE/EXPERIENCED/MASTER/SURGERY_EXPERT/RESEARCH_AWARD/TOP_RATED). " +
                          "awardedDate không được trong tương lai → 400 error.date-future. " +
                          "1 vet có thể nhận cùng badge nhiều lần (vd kỷ niệm năm). Vet không tồn tại → 404."
    )
    public ResponseEntity<BadgeResponse> addVetBadge(
            @PathVariable Long vetId,
            @RequestBody @Valid BadgeRequest request
    ) {
        BadgeResponse created = service.create(vetId, request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @DeleteMapping("/{badgeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete badge (path-tamper qua vet khác → 404, không leak)")
    public void deleteVetBadge(@PathVariable Long vetId, @PathVariable Long badgeId) {
        service.delete(vetId, badgeId);
    }
}
