package com.mss301.petclinic.vets.dto.res;

import java.time.LocalDate;

import com.mss301.petclinic.vets.model.Education;

/**
 * Education response — CRUD trần (không review workflow). Hiển thị ngay cho mọi consumer.
 */
public record EducationResponse(
        Long id,
        Long vetId,
        String schoolName,
        String degree,
        String fieldOfStudy,
        LocalDate startDate,
        LocalDate endDate
) {
    public static EducationResponse from(Education e) {
        return new EducationResponse(
                e.getId(),
                e.getVetId(),
                e.getSchoolName(),
                e.getDegree(),
                e.getFieldOfStudy(),
                e.getStartDate(),
                e.getEndDate()
        );
    }
}
