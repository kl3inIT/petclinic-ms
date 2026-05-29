package com.mss301.petclinic.visits.dto.req;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Yêu cầu tạo đơn thuốc cho một visit. Phải có ít nhất 1 dòng thuốc.
 */
public record CreatePrescriptionRequest(
        @Size(max = 2000) String notes,
        @NotEmpty @Valid List<Item> items
) {

    /** Một dòng thuốc trong đơn. */
    public record Item(
            @NotBlank @Size(max = 200) String medicationName,
            @Size(max = 100) String dosage,
            @Size(max = 100) String frequency,
            @Positive Integer durationDays,
            @Size(max = 1000) String instructions
    ) {}
}
