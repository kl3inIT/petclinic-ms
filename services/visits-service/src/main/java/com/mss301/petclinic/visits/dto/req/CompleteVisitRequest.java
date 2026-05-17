package com.mss301.petclinic.visits.dto.req;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CompleteVisitRequest(
        @NotBlank @Size(max = 4000) String diagnosis,
        @Size(max = 4000) String treatment,
        @DecimalMin("0.0") BigDecimal fee
) {
}
