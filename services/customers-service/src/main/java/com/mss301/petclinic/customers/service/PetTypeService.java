package com.mss301.petclinic.customers.service;

import java.util.List;

import com.mss301.petclinic.customers.dto.res.PetTypeResponse;
import com.mss301.petclinic.customers.model.PetType;

public interface PetTypeService {

    List<PetTypeResponse> findAll();

    /** Resolve catalog row khi PetRequest gửi {@code petTypeId} — null = no-op. */
    PetType resolve(Long petTypeId);
}
