package com.mss301.petclinic.visits.dto.req;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record BookVisitRequest(
        @NotNull Long petId,
        @NotNull Long vetId,
        @NotNull @Future Instant scheduledAt,
        @Size(max = 1000) String reason
) {
}
