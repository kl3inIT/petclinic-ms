package com.mss301.petclinic.customers.service.impl;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.common.storage.StorageProperties;
import com.mss301.petclinic.common.storage.StorageService;
import com.mss301.petclinic.customers.dto.res.PetResponse;
import com.mss301.petclinic.customers.exception.PetNotFoundException;
import com.mss301.petclinic.customers.model.Pet;
import com.mss301.petclinic.customers.repository.PetRepository;
import com.mss301.petclinic.customers.repository.PetSpecifications;
import com.mss301.petclinic.customers.service.PetService;

@Service
@Transactional(readOnly = true)
public class PetServiceImpl implements PetService {

    private static final String PET_PHOTO_ENTITY = "pet-photo";

    private final PetRepository petRepository;
    private final StorageService storage;
    private final StorageProperties storageProps;

    public PetServiceImpl(PetRepository petRepository, StorageService storage,
                          StorageProperties storageProps) {
        this.petRepository = petRepository;
        this.storage = storage;
        this.storageProps = storageProps;
    }

    private String presign(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        return storage.presignedGet(key, storageProps.presignedTtl()).toString();
    }

    @Override
    public Page<PetResponse> findAll(Long ownerId, Long petTypeId, Boolean isActive, Pageable pageable) {
        return petRepository
                .findAll(PetSpecifications.withFilters(ownerId, petTypeId, isActive), pageable)
                .map(pet -> PetResponse.from(pet, this::presign));
    }

    @Override
    public PetResponse findById(Long id) {
        return petRepository.findById(id)
                .map(pet -> PetResponse.from(pet, this::presign))
                .orElseThrow(() -> new PetNotFoundException(id.toString()));
    }

    @Override
    @Transactional
    public PetResponse uploadPhoto(Long id, MultipartFile file) {
        Pet pet = petRepository.findById(id)
                .orElseThrow(() -> new PetNotFoundException(id.toString()));
        MediaValidator.validate(file, PET_PHOTO_ENTITY, storageProps.maxFileSizeBytes());

        String key = "pets/" + id;
        try {
            storage.upload(key, file.getContentType(), file.getInputStream(), file.getSize());
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read uploaded file for pet " + id, e);
        }
        pet.setPhotoId(key);
        return PetResponse.from(petRepository.save(pet), this::presign);
    }

    @Override
    @Transactional
    public PetResponse deletePhoto(Long id) {
        Pet pet = petRepository.findById(id)
                .orElseThrow(() -> new PetNotFoundException(id.toString()));
        if (pet.getPhotoId() != null) {
            storage.delete(pet.getPhotoId());
            pet.setPhotoId(null);
            petRepository.save(pet);
        }
        return PetResponse.from(pet, this::presign);
    }
}
