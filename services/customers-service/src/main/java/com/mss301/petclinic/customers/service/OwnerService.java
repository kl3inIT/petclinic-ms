package com.mss301.petclinic.customers.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.customers.dto.req.OwnerRequest;
import com.mss301.petclinic.customers.dto.req.PetRequest;
import com.mss301.petclinic.customers.dto.req.UpdateOwnerRequest;
import com.mss301.petclinic.customers.dto.res.OwnerResponse;

public interface OwnerService {

    Page<OwnerResponse> findAll(String lastName, Pageable pageable);

    OwnerResponse findById(Long id);

    OwnerResponse create(OwnerRequest request);

    OwnerResponse update(Long id, UpdateOwnerRequest request);

    OwnerResponse addPet(Long ownerId, PetRequest request);

    OwnerResponse updatePet(Long ownerId, Long petId, PetRequest request);

    void removePet(Long ownerId, Long petId);

    void deleteById(Long id);

    /** Upload/overwrite ảnh 1 pet thuộc owner. Trả owner đã enrich presigned URL. */
    OwnerResponse uploadPetPhoto(Long ownerId, Long petId, MultipartFile file);

    /** Xoá ảnh pet qua files-service trước, set photoId=null sau. */
    OwnerResponse deletePetPhoto(Long ownerId, Long petId);

    /** Upload/overwrite avatar chủ nuôi. */
    OwnerResponse uploadOwnerAvatar(Long ownerId, MultipartFile file);

    /** Xoá avatar chủ nuôi. */
    OwnerResponse deleteOwnerAvatar(Long ownerId);
}
