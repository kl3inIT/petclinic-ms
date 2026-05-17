package com.mss301.petclinic.visits.dto.res;

import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.model.VisitStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record VisitResponse(
        Long id,
        Long petId,
        Long vetId,
        UUID customerUserId,
        Instant scheduledAt,
        VisitStatus status,
        String reason,
        String diagnosis,
        String treatment,
        BigDecimal fee
) {
    public static VisitResponse from(Visit v) {
        return new VisitResponse(
                v.getId(),
                v.getPetId(),
                v.getVetId(),
                v.getCustomerUserId(),
                v.getScheduledAt(),
                v.getStatus(),
                v.getReason(),
                v.getDiagnosis(),
                v.getTreatment(),
                v.getFee()
        );
    }
}
