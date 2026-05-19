package com.mss301.petclinic.vets.controller;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.vets.dto.res.TopRatedVetResponse;
import com.mss301.petclinic.vets.service.RatingService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Standalone (KHÔNG nested dưới {vetId}) — cross-vet aggregate. Scope toàn bộ vets,
 * không thuộc 1 vet cụ thể. Đặt path {@code /api/v1/vets/top-rated} thay vì
 * {@code /api/v1/top-rated-vets} để giữ tài nguyên dưới root {@code /vets/...} (consistency).
 */
@RestController
@RequestMapping("/api/v1/vets")
@Tag(name = "Vet Ratings", description = "Cross-vet rating aggregates")
@Validated
public class TopRatedVetsController {

    private final RatingService service;

    public TopRatedVetsController(RatingService service) {
        this.service = service;
    }

    @GetMapping("/top-rated")
    @Operation(
            summary = "Top-N vets theo average rating",
            description = "Chỉ active=true vet, có ít nhất 1 rating. Sort: AVG(score) DESC, tiebreak COUNT(ratings) DESC. " +
                          "limit 1-50 (default 3). Empty list nếu chưa có rating nào."
    )
    public List<TopRatedVetResponse> listTopRatedVets(
            @RequestParam(defaultValue = "3") @Min(1) @Max(50) int limit
    ) {
        return service.getTopRated(limit);
    }
}
