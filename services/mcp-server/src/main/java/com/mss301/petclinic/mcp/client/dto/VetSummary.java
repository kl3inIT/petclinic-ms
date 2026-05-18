package com.mss301.petclinic.mcp.client.dto;

import java.util.List;

public record VetSummary(
        Long id,
        String firstName,
        String lastName,
        List<Specialty> specialties
) {
    public record Specialty(Long id, String name) {}
}
