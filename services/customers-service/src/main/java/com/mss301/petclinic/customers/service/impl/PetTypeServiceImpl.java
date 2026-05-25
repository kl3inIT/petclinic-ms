package com.mss301.petclinic.customers.service.impl;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.customers.dto.req.PetTypeRequest;
import com.mss301.petclinic.customers.dto.res.PetTypeResponse;
import com.mss301.petclinic.customers.exception.PetTypeNotFoundException;
import com.mss301.petclinic.customers.model.PetType;
import com.mss301.petclinic.customers.repository.PetRepository;
import com.mss301.petclinic.customers.repository.PetTypeRepository;
import com.mss301.petclinic.customers.service.PetTypeService;

@Service
@Transactional(readOnly = true)
public class PetTypeServiceImpl implements PetTypeService {

    private final PetTypeRepository repository;
    private final PetRepository petRepository;

    public PetTypeServiceImpl(PetTypeRepository repository, PetRepository petRepository) {
        this.repository = repository;
        this.petRepository = petRepository;
    }

    @Override
    public List<PetTypeResponse> findAll() {
        return repository.findAllByOrderByDisplayOrderAscNameAsc().stream()
                .map(PetTypeResponse::from)
                .toList();
    }

    @Override
    public PetTypeResponse findById(Long id) {
        return repository.findById(id)
                .map(PetTypeResponse::from)
                .orElseThrow(() -> new PetTypeNotFoundException(id.toString()));
    }

    @Override
    @Transactional
    public PetTypeResponse create(PetTypeRequest request) {
        if (repository.findByCode(request.code()).isPresent()) {
            throw new BadRequestAlertException(
                    "Mã code đã tồn tại: " + request.code(),
                    "petType", "code-duplicate");
        }
        try {
            return PetTypeResponse.from(repository.save(request.toEntity()));
        } catch (DataIntegrityViolationException ex) {
            // Race condition: 2 admin tạo đồng thời cùng code → unique constraint fail.
            throw new BadRequestAlertException(
                    "Mã code đã tồn tại: " + request.code(),
                    "petType", "code-duplicate");
        }
    }

    @Override
    @Transactional
    public PetTypeResponse update(Long id, PetTypeRequest request) {
        PetType petType = repository.findById(id)
                .orElseThrow(() -> new PetTypeNotFoundException(id.toString()));
        // Bảo vệ business key: nếu đổi code, đảm bảo code mới chưa được dùng bởi entity khác.
        if (!petType.getCode().equals(request.code())
                && repository.findByCode(request.code())
                        .filter(other -> !other.getId().equals(id))
                        .isPresent()) {
            throw new BadRequestAlertException(
                    "Mã code đã tồn tại: " + request.code(),
                    "petType", "code-duplicate");
        }
        petType.setCode(request.code());
        petType.setName(request.name());
        petType.setDisplayOrder(request.displayOrder());
        return PetTypeResponse.from(petType);
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        if (!repository.existsById(id)) {
            throw new PetTypeNotFoundException(id.toString());
        }
        long inUse = petRepository.countByPetTypeId(id);
        if (inUse > 0) {
            throw new BadRequestAlertException(
                    "Không thể xóa loại pet đang được dùng bởi " + inUse + " pet.",
                    "petType", "in-use");
        }
        repository.deleteById(id);
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
