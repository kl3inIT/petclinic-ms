package com.mss301.petclinic.vets.service.impl;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.vets.client.FilesClient;
import com.mss301.petclinic.vets.dto.res.VetAlbumPhotoResponse;
import com.mss301.petclinic.vets.exception.VetAlbumPhotoNotFoundException;
import com.mss301.petclinic.vets.exception.VetNotFoundException;
import com.mss301.petclinic.vets.model.VetAlbumPhoto;
import com.mss301.petclinic.vets.repository.VetAlbumPhotoRepository;
import com.mss301.petclinic.vets.repository.VetRepository;
import com.mss301.petclinic.vets.service.VetAlbumService;

@Service
@Transactional(readOnly = true)
public class VetAlbumServiceImpl implements VetAlbumService {

    private static final String ENTITY_NAME = "vet-album-photo";

    private final VetAlbumPhotoRepository albumRepository;
    private final VetRepository vetRepository;
    private final FilesClient files;

    public VetAlbumServiceImpl(VetAlbumPhotoRepository albumRepository, VetRepository vetRepository,
                               FilesClient files) {
        this.albumRepository = albumRepository;
        this.vetRepository = vetRepository;
        this.files = files;
    }

    @Override
    public Page<VetAlbumPhotoResponse> listPhotos(Long vetId, Pageable pageable) {
        ensureVetExists(vetId);
        return albumRepository.findByVetId(vetId, pageable)
                .map(p -> VetAlbumPhotoResponse.from(p,
                        files.presignedUrl(p.getObjectKey())));
    }

    @Override
    @Transactional
    public VetAlbumPhotoResponse uploadPhoto(Long vetId, MultipartFile file, String caption) {
        ensureVetExists(vetId);
        MediaValidator.validate(file, ENTITY_NAME, files.maxFileSizeBytes());

        // Save entity TRƯỚC để có id auto-gen → tính key theo id (deterministic, debug dễ).
        // Object key sẽ set ở pass thứ hai vì cần id sau saveAndFlush.
        VetAlbumPhoto entity = new VetAlbumPhoto(vetId, file.getContentType(), file.getSize());
        entity.setCaption(caption);
        entity.setObjectKey("placeholder");  // tạm — sẽ overwrite sau khi có id
        VetAlbumPhoto saved = albumRepository.saveAndFlush(entity);

        String key = "vets/album/" + vetId + "/" + saved.getId();
        boolean uploaded = false;
        try {
            try {
                files.upload(key, file);
                uploaded = true;
            } catch (IOException e) {
                throw new UncheckedIOException("Failed to read uploaded file for vet " + vetId, e);
            }
            saved.setObjectKey(key);
            VetAlbumPhoto persisted = albumRepository.save(saved);
            return VetAlbumPhotoResponse.from(persisted,
                    files.presignedUrl(key));
        } catch (RuntimeException ex) {
            // DB save lần 2 fail (hoặc bất kỳ throw nào sau khi upload xong) → object
            // orphan vì @Transactional sẽ rollback luôn cả saveAndFlush. Cleanup best-effort.
            // Nếu cleanup fail → orphan cleanup job lo phần còn lại.
            if (uploaded) {
                try { files.delete(key); } catch (RuntimeException ignored) { /* best-effort */ }
            }
            throw ex;
        }
    }

    @Override
    @Transactional
    public void deletePhoto(Long vetId, Long photoId) {
        ensureVetExists(vetId);
        VetAlbumPhoto photo = albumRepository.findByIdAndVetId(photoId, vetId)
                .orElseThrow(() -> new VetAlbumPhotoNotFoundException(photoId.toString()));
        files.delete(photo.getObjectKey());
        albumRepository.delete(photo);
    }

    private void ensureVetExists(Long vetId) {
        if (!vetRepository.existsById(vetId)) {
            throw new VetNotFoundException(vetId.toString());
        }
    }
}
