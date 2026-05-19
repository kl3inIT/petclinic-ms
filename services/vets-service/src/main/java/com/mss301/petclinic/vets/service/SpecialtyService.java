package com.mss301.petclinic.vets.service;

import java.util.List;

import com.mss301.petclinic.vets.dto.res.SpecialtyResponse;

public interface SpecialtyService {

    List<SpecialtyResponse> findAll();
}
