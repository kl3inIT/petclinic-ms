package com.mss301.petclinic.customers.service.impl;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.customers.dto.res.PetResponse;
import com.mss301.petclinic.customers.exception.PetNotFoundException;
import com.mss301.petclinic.customers.repository.PetRepository;
import com.mss301.petclinic.customers.repository.PetSpecifications;
import com.mss301.petclinic.customers.service.PetService;

@Service
@Transactional(readOnly = true)
public class PetServiceImpl implements PetService {

    private final PetRepository petRepository;

    public PetServiceImpl(PetRepository petRepository) {
        this.petRepository = petRepository;
    }

    @Override
    public Page<PetResponse> findAll(Long ownerId, Long petTypeId, Boolean isActive, Pageable pageable) {
        return petRepository
                .findAll(PetSpecifications.withFilters(ownerId, petTypeId, isActive), pageable)
                .map(PetResponse::from);
    }

    @Override
    public PetResponse findById(Long id) {
        return petRepository.findById(id)
                .map(PetResponse::from)
                .orElseThrow(() -> new PetNotFoundException(id.toString()));
    }
}
