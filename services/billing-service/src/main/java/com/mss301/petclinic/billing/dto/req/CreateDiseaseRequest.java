package com.mss301.petclinic.billing.dto.req;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.mss301.petclinic.billing.model.Disease;

/** Tạo bệnh mới trong danh mục (ADMIN). */
public record CreateDiseaseRequest(
        @NotBlank @Size(max = 50) String code,
        @NotBlank @Size(max = 150) String name,
        @Size(max = 80) String category,
        String description,
        @NotNull @DecimalMin("0.0") BigDecimal baseCost
) {
    public Disease toEntity() {
        return new Disease(code, name, category, description, baseCost);
    }
}
