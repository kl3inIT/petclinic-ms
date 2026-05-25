package com.mss301.petclinic.customers.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.customers.dto.res.PetTypeResponse;
import com.mss301.petclinic.customers.exception.PetTypeNotFoundException;
import com.mss301.petclinic.customers.model.PetType;
import com.mss301.petclinic.customers.repository.PetTypeRepository;
import com.mss301.petclinic.customers.service.PetTypeService;

@Service
@Transactional(readOnly = true)
public class PetTypeServiceImpl implements PetTypeService {

    private final PetTypeRepository repository;

    public PetTypeServiceImpl(PetTypeRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<PetTypeResponse> findAll() {
        return repository.findAllByOrderByDisplayOrderAscNameAsc().stream()
                .map(PetTypeResponse::from)
                .toList();
    }

    @Override
    public PetType resolve(Long petTypeId) {
        if (petTypeId == null) {
            return null;
        }
        return repository.findById(petTypeId)
                .orElseThrow(() -> new PetTypeNotFoundException(petTypeId.toString()));
    }
}
