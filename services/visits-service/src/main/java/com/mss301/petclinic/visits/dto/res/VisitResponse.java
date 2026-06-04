package com.mss301.petclinic.visits.dto.res;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.model.VisitStatus;

public record VisitResponse(
        Long id,
        Long petId,
        String petName,
        String petBreed,
        LocalDate petBirthDate,
        Long vetId,
        UUID customerUserId,
        String ownerName,
        String ownerPhone,
        Instant scheduledAt,
        VisitStatus status,
        String reason,
        String diagnosis,
        String treatment,
        BigDecimal fee,
        Long processInstanceKey
) {
    public static VisitResponse from(Visit v) {
        return new VisitResponse(
                v.getId(),
                v.getPetId(),
                v.getPetName(),
                v.getPetBreed(),
                v.getPetBirthDate(),
                v.getVetId(),
                v.getCustomerUserId(),
                v.getOwnerName(),
                v.getOwnerPhone(),
                v.getScheduledAt(),
                v.getStatus(),
                v.getReason(),
                v.getDiagnosis(),
                v.getTreatment(),
                v.getFee(),
                v.getProcessInstanceKey()
        );
    }
}
