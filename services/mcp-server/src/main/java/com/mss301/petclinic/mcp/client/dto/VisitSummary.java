package com.mss301.petclinic.mcp.client.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record VisitSummary(
        Long id,
        Long petId,
        Long vetId,
        UUID customerUserId,
        Instant scheduledAt,
        String status,
        String reason,
        String diagnosis,
        String treatment,
        BigDecimal fee
) {}
