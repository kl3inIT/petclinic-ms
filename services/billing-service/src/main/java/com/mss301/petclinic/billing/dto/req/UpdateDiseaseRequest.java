package com.mss301.petclinic.billing.dto.req;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

/** Partial update bệnh (ADMIN) — field null = giữ nguyên. */
public record UpdateDiseaseRequest(
        @Size(max = 150) String name,
        @Size(max = 80) String category,
        String description,
        @DecimalMin("0.0") BigDecimal baseCost,
        Boolean active
) {
}
