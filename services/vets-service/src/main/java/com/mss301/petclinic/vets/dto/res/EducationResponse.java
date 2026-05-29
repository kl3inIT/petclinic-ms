package com.mss301.petclinic.vets.dto.res;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.mss301.petclinic.vets.model.Education;

/**
 * Education response. {@code status}: PENDING | APPROVED | REJECTED.
 * Customer/booking page chỉ hiển thị APPROVED; vet thấy mọi status của chính mình.
 */
public record EducationResponse(
        Long id,
        Long vetId,
        String schoolName,
        String degree,
        String fieldOfStudy,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        String reviewedBy,
        OffsetDateTime reviewedAt,
        String rejectReason
) {
    public static EducationResponse from(Education e) {
        return new EducationResponse(
                e.getId(),
                e.getVetId(),
                e.getSchoolName(),
                e.getDegree(),
                e.getFieldOfStudy(),
                e.getStartDate(),
                e.getEndDate(),
                e.getStatus(),
                e.getReviewedBy(),
                e.getReviewedAt(),
                e.getRejectReason()
        );
    }
}
