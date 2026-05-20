package com.mss301.petclinic.vets.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.vets.dto.req.UpdateVetRequest;
import com.mss301.petclinic.vets.dto.req.VetRequest;
import com.mss301.petclinic.vets.dto.res.VetResponse;

public interface VetService {

    Page<VetResponse> findAll(String lastName, Long specialtyId, Pageable pageable);

    VetResponse findById(Long id);

    VetResponse create(VetRequest request);

    VetResponse update(Long id, UpdateVetRequest request);

    void deleteById(Long id);
}
