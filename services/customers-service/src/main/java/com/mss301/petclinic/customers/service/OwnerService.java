package com.mss301.petclinic.customers.service;

import com.mss301.petclinic.customers.dto.req.OwnerRequest;
import com.mss301.petclinic.customers.dto.res.OwnerResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface OwnerService {

    Page<OwnerResponse> findAll(String lastName, Pageable pageable);

    OwnerResponse findById(Long id);

    OwnerResponse create(OwnerRequest request);

    void deleteById(Long id);
}
