package com.mss301.petclinic.visits.dto.req;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;

public record VisitTransitionRequest(
        @NotBlank String targetStatus,
        String diagnosis,
        String treatment,
        BigDecimal fee
) {}
