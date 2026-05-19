package com.mss301.petclinic.vets.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.vets.dto.res.VetAlbumPhotoResponse;

public interface VetAlbumService {

    Page<VetAlbumPhotoResponse> listPhotos(Long vetId, Pageable pageable);

    VetAlbumPhotoResponse uploadPhoto(Long vetId, MultipartFile file, String caption);

    void deletePhoto(Long vetId, Long photoId);
}
