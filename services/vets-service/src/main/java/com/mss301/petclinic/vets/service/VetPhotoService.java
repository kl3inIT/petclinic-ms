package com.mss301.petclinic.vets.service;

import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.vets.dto.res.VetPhotoResponse;

public interface VetPhotoService {

    VetPhotoResponse getPhoto(Long vetId);

    /**
     * Upload mới hoặc overwrite. Trả về metadata + presigned URL.
     */
    VetPhotoResponse uploadPhoto(Long vetId, MultipartFile file);

    void deletePhoto(Long vetId);
}
