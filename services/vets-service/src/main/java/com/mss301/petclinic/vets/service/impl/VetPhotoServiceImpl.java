package com.mss301.petclinic.vets.service.impl;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.common.storage.StorageProperties;
import com.mss301.petclinic.common.storage.StorageService;
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
    private final StorageService storage;
    private final StorageProperties props;

    public VetPhotoServiceImpl(VetPhotoRepository photoRepository, VetRepository vetRepository,
                               StorageService storage, StorageProperties props) {
        this.photoRepository = photoRepository;
        this.vetRepository = vetRepository;
        this.storage = storage;
        this.props = props;
    }

    @Override
    public VetPhotoResponse getPhoto(Long vetId) {
        ensureVetExists(vetId);
        VetPhoto photo = photoRepository.findById(vetId)
                .orElseThrow(() -> new VetPhotoNotFoundException(vetId.toString()));
        return VetPhotoResponse.from(photo, storage.presignedGet(photo.getObjectKey(), props.presignedTtl()));
    }

    @Override
    @Transactional
    public VetPhotoResponse uploadPhoto(Long vetId, MultipartFile file) {
        ensureVetExists(vetId);
        MediaValidator.validate(file, ENTITY_NAME, props.maxFileSizeBytes());

        // Avatar 1-1: key cố định theo vetId → re-upload tự động overwrite MinIO object
        // + DB entity (upsert qua save với cùng PK). Idempotent giữa các lần upload.
        String key = "vets/photo/" + vetId;
        try {
            storage.upload(key, file.getContentType(), file.getInputStream(), file.getSize());
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read uploaded file for vet " + vetId, e);
        }

        // Compensating cleanup: nếu DB save fail sau khi MinIO đã ghi → revert MinIO object về
        // state cũ (xoá nếu là insert mới). Không revert được thành state trước-upload cho
        // case update (object cũ đã bị overwrite), nhưng tránh được state inconsistency tệ
        // nhất: DB metadata cũ + MinIO content mới. Re-upload sẽ retry idempotent.
        // Single findById giảm race window (CodeRabbit review): concurrent upload khác
        // không thể insert giữa 2 query rồi xoá MinIO object oan.
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
            return VetPhotoResponse.from(saved, storage.presignedGet(key, props.presignedTtl()));
        } catch (RuntimeException ex) {
            if (isNew) {
                try { storage.delete(key); } catch (RuntimeException ignored) { /* best-effort */ }
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
        return VetPhotoResponse.from(photo, storage.presignedGet(photo.getObjectKey(), props.presignedTtl()));
    }

    @Override
    @Transactional
    public VetPhotoResponse rejectPhoto(Long vetId, String reviewer, String reason) {
        ensureVetExists(vetId);
        VetPhoto photo = photoRepository.findById(vetId)
                .orElseThrow(() -> new VetPhotoNotFoundException(vetId.toString()));
        photo.reject(reviewer, reason);
        return VetPhotoResponse.from(photo, storage.presignedGet(photo.getObjectKey(), props.presignedTtl()));
    }

    @Override
    public List<VetPhotoResponse> listPendingPhotos() {
        return photoRepository.findByStatus("PENDING").stream()
                .map(p -> VetPhotoResponse.from(p, storage.presignedGet(p.getObjectKey(), props.presignedTtl())))
                .toList();
    }

    @Override
    @Transactional
    public void deletePhoto(Long vetId) {
        ensureVetExists(vetId);
        VetPhoto photo = photoRepository.findById(vetId)
                .orElseThrow(() -> new VetPhotoNotFoundException(vetId.toString()));
        // Xoá MinIO TRƯỚC, DB SAU. Nếu MinIO fail → exception, DB row giữ lại → retry được.
        // Ngược lại sẽ leak orphan object trong MinIO mà DB không biết.
        storage.delete(photo.getObjectKey());
        photoRepository.delete(photo);
    }

    private void ensureVetExists(Long vetId) {
        if (!vetRepository.existsById(vetId)) {
            throw new VetNotFoundException(vetId.toString());
        }
    }
}
