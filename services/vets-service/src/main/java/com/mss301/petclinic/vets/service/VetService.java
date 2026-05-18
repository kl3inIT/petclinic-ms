package com.mss301.petclinic.vets.service;

import com.mss301.petclinic.vets.dto.req.VetRequest;
import com.mss301.petclinic.vets.dto.res.VetResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface VetService {

    Page<VetResponse> findAll(String lastName, Long specialtyId, Pageable pageable);

    VetResponse findById(Long id);

    VetResponse create(VetRequest request);

    void deleteById(Long id);
}
