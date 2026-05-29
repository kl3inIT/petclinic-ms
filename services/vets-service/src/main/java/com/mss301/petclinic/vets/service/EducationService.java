package com.mss301.petclinic.vets.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.vets.dto.req.EducationRequest;
import com.mss301.petclinic.vets.dto.req.UpdateEducationRequest;
import com.mss301.petclinic.vets.dto.res.EducationResponse;

public interface EducationService {

    Page<EducationResponse> findAllByVetId(Long vetId, Pageable pageable);

    EducationResponse findByVetIdAndId(Long vetId, Long educationId);

    EducationResponse create(Long vetId, EducationRequest request);

    EducationResponse update(Long vetId, Long educationId, UpdateEducationRequest request);

    void delete(Long vetId, Long educationId);

    /** Staff/admin approve. */
    EducationResponse approve(Long vetId, Long educationId, String reviewer);

    /** Staff/admin reject với reason. */
    EducationResponse reject(Long vetId, Long educationId, String reviewer, String reason);

    /** List education PENDING của TẤT CẢ vet — admin review queue. */
    List<EducationResponse> listPending();
}
