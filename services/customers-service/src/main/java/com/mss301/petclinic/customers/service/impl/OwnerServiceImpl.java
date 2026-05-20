package com.mss301.petclinic.customers.service.impl;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.customers.dto.req.OwnerRequest;
import com.mss301.petclinic.customers.dto.res.OwnerResponse;
import com.mss301.petclinic.customers.exception.OwnerNotFoundException;
import com.mss301.petclinic.customers.repository.OwnerRepository;
import com.mss301.petclinic.customers.service.OwnerService;

@Service
@Transactional(readOnly = true)
public class OwnerServiceImpl implements OwnerService {

    private final OwnerRepository repository;

    public OwnerServiceImpl(OwnerRepository repository) {
        this.repository = repository;
    }

    @Override
    public Page<OwnerResponse> findAll(String lastName, Pageable pageable) {
        var page = (lastName == null || lastName.isBlank())
                ? repository.findAll(pageable)
                : repository.findByLastNameContainingIgnoreCase(lastName, pageable);
        return page.map(OwnerResponse::from);
    }

    @Override
    public OwnerResponse findById(Long id) {
        return repository.findById(id)
                .map(OwnerResponse::from)
                .orElseThrow(() -> new OwnerNotFoundException(id.toString()));
    }

    @Override
    @Transactional
    public OwnerResponse create(OwnerRequest request) {
        return OwnerResponse.from(repository.save(request.toEntity()));
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        if (!repository.existsById(id)) {
            throw new OwnerNotFoundException(id.toString());
        }
        repository.deleteById(id);
    }
}
