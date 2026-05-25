package com.mss301.petclinic.customers.service;

import java.util.List;

import com.mss301.petclinic.customers.dto.req.PetTypeRequest;
import com.mss301.petclinic.customers.dto.res.PetTypeResponse;
import com.mss301.petclinic.customers.model.PetType;

public interface PetTypeService {

    List<PetTypeResponse> findAll();

    PetTypeResponse findById(Long id);

    PetTypeResponse create(PetTypeRequest request);

    PetTypeResponse update(Long id, PetTypeRequest request);

    void deleteById(Long id);

    /** Resolve catalog row khi PetRequest gửi {@code petTypeId} — null = no-op. */
    PetType resolve(Long petTypeId);
}
