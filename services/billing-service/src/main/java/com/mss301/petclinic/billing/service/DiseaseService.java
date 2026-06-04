package com.mss301.petclinic.billing.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.billing.dto.req.CreateDiseaseRequest;
import com.mss301.petclinic.billing.dto.req.UpdateDiseaseRequest;
import com.mss301.petclinic.billing.dto.res.DiseaseResponse;

/** Quản lý danh mục bệnh + chi phí điều trị. */
public interface DiseaseService {

    Page<DiseaseResponse> search(String q, String category, Boolean active, Pageable pageable);

    DiseaseResponse getById(Long id);

    DiseaseResponse create(CreateDiseaseRequest request);

    DiseaseResponse update(Long id, UpdateDiseaseRequest request);

    void delete(Long id);
}
