package com.mss301.petclinic.vets.service;

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
}
