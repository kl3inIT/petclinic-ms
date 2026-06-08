package com.mss301.petclinic.customers.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.customers.dto.res.PetResponse;

/**
 * Pet read-only service — pet write (trừ ảnh) nằm trong Owner aggregate
 * ({@link OwnerService#addPet}/{@code updatePet}/{@code removePet}).
 * Ảnh pet là sub-resource độc lập (admin), không qua aggregate.
 */
public interface PetService {

    Page<PetResponse> findAll(Long ownerId, Long petTypeId, Boolean isActive, Pageable pageable);

    PetResponse findById(Long id);

    /** Admin upload/replace ảnh pet bất kỳ (key {@code pets/<id>}). */
    PetResponse uploadPhoto(Long id, MultipartFile file);

    /** Admin xoá ảnh pet. */
    PetResponse deletePhoto(Long id);
}
