package com.mss301.petclinic.vets.dto.req;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.mss301.petclinic.vets.model.Education;

/**
 * Create-education request body. Sub-resource POST /api/v1/vets/{vetId}/educations —
 * vetId KHÔNG nằm trong body, lấy từ path (single source of truth, tránh inconsistency).
 *
 * <p>Validate {@code endDate >= startDate} ở service layer (Bean Validation không tiện cho
 * cross-field). Education chưa kết thúc → {@code endDate} null.</p>
 */
public record EducationRequest(
        @NotBlank @Size(max = 200) String schoolName,
        @NotBlank @Size(max = 100) String degree,
        @Size(max = 150) String fieldOfStudy,
        @NotNull LocalDate startDate,
        LocalDate endDate
) {
    public Education toEntity(Long vetId) {
        Education education = new Education(vetId, schoolName, degree, startDate);
        education.setFieldOfStudy(fieldOfStudy);
        education.setEndDate(endDate);
        return education;
    }
}
