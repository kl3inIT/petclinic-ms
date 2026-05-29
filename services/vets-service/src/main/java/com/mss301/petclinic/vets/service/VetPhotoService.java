package com.mss301.petclinic.vets.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.vets.dto.res.VetPhotoResponse;

public interface VetPhotoService {

    VetPhotoResponse getPhoto(Long vetId);

    /**
     * Upload mới hoặc overwrite. Trả về metadata + presigned URL.
     * Mỗi upload đặt status=PENDING — staff/admin phải approve mới hiển thị public.
     */
    VetPhotoResponse uploadPhoto(Long vetId, MultipartFile file);

    void deletePhoto(Long vetId);

    /** Staff/admin approve photo PENDING của vet. */
    VetPhotoResponse approvePhoto(Long vetId, String reviewer);

    /** Staff/admin reject photo PENDING với lý do. */
    VetPhotoResponse rejectPhoto(Long vetId, String reviewer, String reason);

    /** List photo PENDING của TẤT CẢ vet — cho admin dashboard review queue. */
    List<VetPhotoResponse> listPendingPhotos();
}
