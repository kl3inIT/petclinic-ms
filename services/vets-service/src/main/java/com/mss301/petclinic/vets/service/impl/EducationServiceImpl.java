package com.mss301.petclinic.vets.service.impl;

import java.time.LocalDate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.vets.dto.req.EducationRequest;
import com.mss301.petclinic.vets.dto.req.UpdateEducationRequest;
import com.mss301.petclinic.vets.dto.res.EducationResponse;
import com.mss301.petclinic.vets.exception.EducationNotFoundException;
import com.mss301.petclinic.vets.exception.VetNotFoundException;
import com.mss301.petclinic.vets.model.Education;
import com.mss301.petclinic.vets.repository.EducationRepository;
import com.mss301.petclinic.vets.repository.VetRepository;
import com.mss301.petclinic.vets.service.EducationService;

@Service
@Transactional(readOnly = true)
public class EducationServiceImpl implements EducationService {

    private static final String ENTITY_NAME = "education";

    private final EducationRepository educationRepository;
    private final VetRepository vetRepository;

    public EducationServiceImpl(EducationRepository educationRepository, VetRepository vetRepository) {
        this.educationRepository = educationRepository;
        this.vetRepository = vetRepository;
    }

    @Override
    public Page<EducationResponse> findAllByVetId(Long vetId, Pageable pageable) {
        ensureVetExists(vetId);
        return educationRepository.findByVetId(vetId, pageable).map(EducationResponse::from);
    }

    @Override
    public EducationResponse findByVetIdAndId(Long vetId, Long educationId) {
        ensureVetExists(vetId);
        return educationRepository
                .findByIdAndVetId(educationId, vetId)
                .map(EducationResponse::from)
                .orElseThrow(() -> new EducationNotFoundException(educationId.toString()));
    }

    @Override
    @Transactional
    public EducationResponse create(Long vetId, EducationRequest request) {
        ensureVetExists(vetId);
        validateDates(request.startDate(), request.endDate());
        Education saved = educationRepository.save(request.toEntity(vetId));
        return EducationResponse.from(saved);
    }

    @Override
    @Transactional
    public EducationResponse update(Long vetId, Long educationId, UpdateEducationRequest request) {
        ensureVetExists(vetId);
        Education education = educationRepository
                .findByIdAndVetId(educationId, vetId)
                .orElseThrow(() -> new EducationNotFoundException(educationId.toString()));

        if (request.hasSchoolName()) {
            if (request.schoolName().isBlank()) {
                throw new BadRequestAlertException("schoolName must not be blank", ENTITY_NAME, "schoolName-blank");
            }
            education.setSchoolName(request.schoolName());
        }
        if (request.hasDegree()) {
            if (request.degree().isBlank()) {
                throw new BadRequestAlertException("degree must not be blank", ENTITY_NAME, "degree-blank");
            }
            education.setDegree(request.degree());
        }
        if (request.hasFieldOfStudy()) {
            // empty string = clear field (set null)
            education.setFieldOfStudy(request.fieldOfStudy().isBlank() ? null : request.fieldOfStudy());
        }
        if (request.hasStartDate()) {
            education.setStartDate(request.startDate());
        }
        if (request.hasEndDate()) {
            education.setEndDate(request.endDate());
        }

        // Validate sau khi merge — tránh case PATCH startDate mới khiến endDate cũ < startDate mới
        validateDates(education.getStartDate(), education.getEndDate());

        return EducationResponse.from(educationRepository.save(education));
    }

    @Override
    @Transactional
    public void delete(Long vetId, Long educationId) {
        ensureVetExists(vetId);
        Education education = educationRepository
                .findByIdAndVetId(educationId, vetId)
                .orElseThrow(() -> new EducationNotFoundException(educationId.toString()));
        educationRepository.delete(education);
    }

    /**
     * Vet không tồn tại → 404 trên sub-resource (parent missing). Không leak existence của education.
     */
    private void ensureVetExists(Long vetId) {
        if (!vetRepository.existsById(vetId)) {
            throw new VetNotFoundException(vetId.toString());
        }
    }

    /**
     * {@code endDate >= startDate} khi cả 2 có giá trị. {@code endDate = null} (đang học) → OK.
     * {@code startDate} trong tương lai → cho phép (plan trước khi nhập học).
     */
    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new BadRequestAlertException(
                    "endDate (" + endDate + ") must be >= startDate (" + startDate + ")",
                    ENTITY_NAME,
                    "date-invalid"
            );
        }
    }
}
