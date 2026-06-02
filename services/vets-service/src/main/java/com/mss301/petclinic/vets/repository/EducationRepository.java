package com.mss301.petclinic.vets.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.vets.model.Education;

public interface EducationRepository extends JpaRepository<Education, Long> {

    Page<Education> findByVetId(Long vetId, Pageable pageable);

    /**
     * Lookup education theo cả {@code id} + {@code vetId} — bảo vệ chống path-tampering:
     * GET /api/v1/vets/{vetId}/educations/{eduId} mà eduId thuộc vetId khác → 404 (không leak existence).
     */
    Optional<Education> findByIdAndVetId(Long id, Long vetId);
}
