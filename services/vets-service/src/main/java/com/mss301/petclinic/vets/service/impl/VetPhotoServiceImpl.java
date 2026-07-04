package com.mss301.petclinic.vets.service.impl;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.vets.client.FilesClient;
import com.mss301.petclinic.vets.dto.res.VetPhotoResponse;
import com.mss301.petclinic.vets.exception.VetNotFoundException;
import com.mss301.petclinic.vets.exception.VetPhotoNotFoundException;
import com.mss301.petclinic.vets.model.VetPhoto;
import com.mss301.petclinic.vets.repository.VetPhotoRepository;
import com.mss301.petclinic.vets.repository.VetRepository;
import com.mss301.petclinic.vets.service.VetPhotoService;

@Service
@Transactional(readOnly = true)
public class VetPhotoServiceImpl implements VetPhotoService {

    private static final String ENTITY_NAME = "vet-photo";

    private final VetPhotoRepository photoRepository;
    private final VetRepository vetRepository;
    private final FilesClient files;

    public VetPhotoServiceImpl(VetPhotoRepository photoRepository, VetRepository vetRepository,
                               FilesClient files) {
        this.photoRepository = photoRepository;
        this.vetRepository = vetRepository;
        this.files = files;
    }

    @Override
    public VetPhotoResponse getPhoto(Long vetId) {
        ensureVetExists(vetId);
        VetPhoto photo = photoRepository.findById(vetId)
                .orElseThrow(() -> new VetPhotoNotFoundException(vetId.toString()));
        return VetPhotoResponse.from(photo, files.presignedUrl(photo.getObjectKey()));
    }

    @Override
    @Transactional
    public VetPhotoResponse uploadPhoto(Long vetId, MultipartFile file) {
        ensureVetExists(vetId);
        MediaValidator.validate(file, ENTITY_NAME, files.maxFileSizeBytes());

        // Avatar 1-1: key cố định theo vetId → re-upload tự động overwrite object
        // + DB entity (upsert qua save với cùng PK). Idempotent giữa các lần upload.
        String key = "vets/photo/" + vetId;
        try {
            files.upload(key, file);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read uploaded file for vet " + vetId, e);
        }

        // Compensating cleanup: nếu DB save fail sau khi file đã ghi → xoá object mới
        // state cũ (xoá nếu là insert mới). Không revert được thành state trước-upload cho
        // case update (object cũ đã bị overwrite), nhưng tránh được state inconsistency tệ
        // nhất: DB metadata cũ + object content mới. Re-upload sẽ retry idempotent.
        // Single findById giảm race window (CodeRabbit review): concurrent upload khác
        // không thể insert giữa 2 query rồi xoá object oan.
        Optional<VetPhoto> existing = photoRepository.findById(vetId);
        boolean isNew = existing.isEmpty();
        try {
            VetPhoto photo = existing
                    .orElseGet(() -> new VetPhoto(vetId, key, file.getContentType(), file.getSize()));
            photo.setObjectKey(key);
            photo.setContentType(file.getContentType());
            photo.setSizeBytes(file.getSize());
            photo.setUploadedAt(java.time.OffsetDateTime.now());
            // Mỗi lần upload mới → reset về PENDING, chờ staff/admin duyệt lại.
            photo.setStatus("PENDING");
            photo.setReviewedBy(null);
            photo.setReviewedAt(null);
            photo.setRejectReason(null);
            VetPhoto saved = photoRepository.save(photo);
            return VetPhotoResponse.from(saved, files.presignedUrl(key));
        } catch (RuntimeException ex) {
            if (isNew) {
                try { files.delete(key); } catch (RuntimeException ignored) { /* best-effort */ }
            }
            throw ex;
        }
    }

    @Override
    @Transactional
    public VetPhotoResponse approvePhoto(Long vetId, String reviewer) {
        ensureVetExists(vetId);
        VetPhoto photo = photoRepository.findById(vetId)
                .orElseThrow(() -> new VetPhotoNotFoundException(vetId.toString()));
        photo.approve(reviewer);
        return VetPhotoResponse.from(photo, files.presignedUrl(photo.getObjectKey()));
    }

    @Override
    @Transactional
    public VetPhotoResponse rejectPhoto(Long vetId, String reviewer, String reason) {
        ensureVetExists(vetId);
        VetPhoto photo = photoRepository.findById(vetId)
                .orElseThrow(() -> new VetPhotoNotFoundException(vetId.toString()));
        photo.reject(reviewer, reason);
        return VetPhotoResponse.from(photo, files.presignedUrl(photo.getObjectKey()));
    }

    @Override
    public List<VetPhotoResponse> listPendingPhotos() {
        return photoRepository.findByStatus("PENDING").stream()
                .map(p -> VetPhotoResponse.from(p, files.presignedUrl(p.getObjectKey())))
                .toList();
    }

    @Override
    @Transactional
    public void deletePhoto(Long vetId) {
        ensureVetExists(vetId);
        VetPhoto photo = photoRepository.findById(vetId)
                .orElseThrow(() -> new VetPhotoNotFoundException(vetId.toString()));
        // Xoá binary qua files-service TRƯỚC, DB SAU. Nếu fail → giữ row, retry được.
        // Ngược lại sẽ leak orphan object mà DB không biết.
        files.delete(photo.getObjectKey());
        photoRepository.delete(photo);
    }

    private void ensureVetExists(Long vetId) {
        if (!vetRepository.existsById(vetId)) {
            throw new VetNotFoundException(vetId.toString());
        }
    }
}
