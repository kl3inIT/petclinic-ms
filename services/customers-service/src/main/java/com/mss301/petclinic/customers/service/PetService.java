package com.mss301.petclinic.customers.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.customers.dto.res.PetResponse;

/**
 * Pet read-only service — pet write nằm trong Owner aggregate
 * ({@link OwnerService#addPet}/{@code updatePet}/{@code removePet}).
 */
public interface PetService {

    Page<PetResponse> findAll(Long ownerId, Long petTypeId, Boolean isActive, Pageable pageable);

    PetResponse findById(Long id);
}
