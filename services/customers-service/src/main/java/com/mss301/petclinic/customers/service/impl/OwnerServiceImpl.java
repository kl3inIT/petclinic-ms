package com.mss301.petclinic.customers.service.impl;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.customers.dto.req.OwnerRequest;
import com.mss301.petclinic.customers.dto.req.PetRequest;
import com.mss301.petclinic.customers.dto.req.UpdateOwnerRequest;
import com.mss301.petclinic.customers.dto.res.OwnerResponse;
import com.mss301.petclinic.customers.exception.OwnerNotFoundException;
import com.mss301.petclinic.customers.exception.PetNotFoundException;
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
    public OwnerResponse update(Long id, UpdateOwnerRequest request) {
        var owner = repository.findById(id)
                .orElseThrow(() -> new OwnerNotFoundException(id.toString()));

        if (request.firstName() != null && !request.firstName().isBlank()) {
            owner.setFirstName(request.firstName());
        }
        if (request.lastName() != null && !request.lastName().isBlank()) {
            owner.setLastName(request.lastName());
        }
        if (request.address() != null) {
            owner.setAddress(blankToNull(request.address()));
        }
        if (request.city() != null) {
            owner.setCity(blankToNull(request.city()));
        }
        if (request.telephone() != null) {
            owner.setTelephone(blankToNull(request.telephone()));
        }
        return OwnerResponse.from(owner);
    }

    @Override
    @Transactional
    public OwnerResponse addPet(Long ownerId, PetRequest request) {
        var owner = repository.findById(ownerId)
                .orElseThrow(() -> new OwnerNotFoundException(ownerId.toString()));
        owner.addPet(request.toEntity());
        return OwnerResponse.from(repository.saveAndFlush(owner));
    }

    @Override
    @Transactional
    public OwnerResponse updatePet(Long ownerId, Long petId, PetRequest request) {
        var owner = repository.findById(ownerId)
                .orElseThrow(() -> new OwnerNotFoundException(ownerId.toString()));
        var pet = owner.getPets().stream()
                .filter(candidate -> petId.equals(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new PetNotFoundException(petId.toString()));

        pet.setName(request.name());
        pet.setBirthDate(request.birthDate());
        pet.setType(request.type());
        pet.setPetTypeId(request.petTypeId());
        pet.setIsActive(request.isActive() == null ? true : request.isActive());
        pet.setWeight(request.weight());
        pet.setPhotoId(request.photoId());
        return OwnerResponse.from(owner);
    }

    @Override
    @Transactional
    public void removePet(Long ownerId, Long petId) {
        var owner = repository.findById(ownerId)
                .orElseThrow(() -> new OwnerNotFoundException(ownerId.toString()));
        var pet = owner.getPets().stream()
                .filter(candidate -> petId.equals(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new PetNotFoundException(petId.toString()));
        owner.removePet(pet);
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        if (!repository.existsById(id)) {
            throw new OwnerNotFoundException(id.toString());
        }
        repository.deleteById(id);
    }

    private static String blankToNull(String value) {
        return value.isBlank() ? null : value;
    }
}
