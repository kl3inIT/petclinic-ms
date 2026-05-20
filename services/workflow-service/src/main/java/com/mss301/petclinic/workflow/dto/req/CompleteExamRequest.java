package com.mss301.petclinic.workflow.dto.req;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CompleteExamRequest(
        @NotBlank String diagnosis,
        @NotBlank String treatment,
        @NotNull BigDecimal fee
) {}
