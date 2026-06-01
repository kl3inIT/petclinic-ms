package com.mss301.petclinic.billing.service.impl;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.billing.dto.req.CreateDiseaseRequest;
import com.mss301.petclinic.billing.dto.req.UpdateDiseaseRequest;
import com.mss301.petclinic.billing.dto.res.DiseaseResponse;
import com.mss301.petclinic.billing.exception.DiseaseNotFoundException;
import com.mss301.petclinic.billing.model.Disease;
import com.mss301.petclinic.billing.repository.DiseaseRepository;
import com.mss301.petclinic.billing.repository.DiseaseSpecifications;
import com.mss301.petclinic.billing.service.DiseaseService;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

@Service
@Transactional(readOnly = true)
public class DiseaseServiceImpl implements DiseaseService {

    private final DiseaseRepository repository;

    public DiseaseServiceImpl(DiseaseRepository repository) {
        this.repository = repository;
    }

    @Override
    public Page<DiseaseResponse> search(String q, String category, Boolean active, Pageable pageable) {
        return repository.findAll(DiseaseSpecifications.filter(q, category, active), pageable)
                .map(DiseaseResponse::from);
    }

    @Override
    public DiseaseResponse getById(Long id) {
        return DiseaseResponse.from(loadOrThrow(id));
    }

    @Override
    @Transactional
    public DiseaseResponse create(CreateDiseaseRequest request) {
        if (repository.existsByCode(request.code())) {
            throw new BadRequestAlertException(
                    "Mã bệnh đã tồn tại: " + request.code(), "Disease", "code-exists");
        }
        return DiseaseResponse.from(repository.save(request.toEntity()));
    }

    @Override
    @Transactional
    public DiseaseResponse update(Long id, UpdateDiseaseRequest request) {
        Disease disease = loadOrThrow(id);
        disease.update(request.name(), request.category(), request.description(),
                request.baseCost(), request.active());
        return DiseaseResponse.from(disease);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Disease disease = loadOrThrow(id);
        repository.delete(disease);
    }

    private Disease loadOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new DiseaseNotFoundException(String.valueOf(id)));
    }
}
