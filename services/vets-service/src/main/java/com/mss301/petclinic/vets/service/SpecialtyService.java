package com.mss301.petclinic.vets.service;

import com.mss301.petclinic.vets.dto.res.SpecialtyResponse;

import java.util.List;

public interface SpecialtyService {

    List<SpecialtyResponse> findAll();
}
