package com.mss301.petclinic.mcp.client.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Tolerant Reader của owner — chỉ field mà tool muốn LLM thấy.
 * Customers-service có thể thêm field (vd: createdAt, notes) — Jackson ignore extras.
 */
public record OwnerSummary(
        Long id,
        String firstName,
        String lastName,
        String address,
        String city,
        String telephone,
        List<PetInline> pets
) {
    public record PetInline(Long id, String name, LocalDate birthDate, String type) {}
}
