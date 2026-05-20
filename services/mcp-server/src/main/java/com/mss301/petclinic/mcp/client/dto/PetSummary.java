package com.mss301.petclinic.mcp.client.dto;

import java.time.LocalDate;

public record PetSummary(
        Long id,
        String name,
        LocalDate birthDate,
        String type,
        Long ownerId
) {}
