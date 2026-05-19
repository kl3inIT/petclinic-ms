package com.mss301.petclinic.vets.service.impl;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.vets.dto.res.SpecialtyResponse;
import com.mss301.petclinic.vets.repository.SpecialtyRepository;
import com.mss301.petclinic.vets.service.SpecialtyService;

@Service
@Transactional(readOnly = true)
public class SpecialtyServiceImpl implements SpecialtyService {

    private final SpecialtyRepository repository;

    public SpecialtyServiceImpl(SpecialtyRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<SpecialtyResponse> findAll() {
        return repository.findAll(Sort.by("name")).stream()
                .map(SpecialtyResponse::from)
                .toList();
    }
}
