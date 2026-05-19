package com.mss301.petclinic.vets.service.impl;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.vets.config.StorageProperties;
import com.mss301.petclinic.vets.dto.res.VetAlbumPhotoResponse;
import com.mss301.petclinic.vets.exception.VetAlbumPhotoNotFoundException;
import com.mss301.petclinic.vets.exception.VetNotFoundException;
import com.mss301.petclinic.vets.model.VetAlbumPhoto;
import com.mss301.petclinic.vets.repository.VetAlbumPhotoRepository;
import com.mss301.petclinic.vets.repository.VetRepository;
import com.mss301.petclinic.vets.service.StorageService;
import com.mss301.petclinic.vets.service.VetAlbumService;

@Service
@Transactional(readOnly = true)
public class VetAlbumServiceImpl implements VetAlbumService {

    private static final String ENTITY_NAME = "vet-album-photo";

    private final VetAlbumPhotoRepository albumRepository;
    private final VetRepository vetRepository;
    private final StorageService storage;
    private final StorageProperties props;

    public VetAlbumServiceImpl(VetAlbumPhotoRepository albumRepository, VetRepository vetRepository,
                               StorageService storage, StorageProperties props) {
        this.albumRepository = albumRepository;
        this.vetRepository = vetRepository;
        this.storage = storage;
        this.props = props;
    }

    @Override
    public Page<VetAlbumPhotoResponse> listPhotos(Long vetId, Pageable pageable) {
        ensureVetExists(vetId);
        return albumRepository.findByVetId(vetId, pageable)
                .map(p -> VetAlbumPhotoResponse.from(p,
                        storage.presignedGet(p.getObjectKey(), props.presignedTtl())));
    }

    @Override
    @Transactional
    public VetAlbumPhotoResponse uploadPhoto(Long vetId, MultipartFile file, String caption) {
        ensureVetExists(vetId);
        MediaValidator.validate(file, ENTITY_NAME, props.maxFileSizeBytes());

        // Save entity TRƯỚC để có id auto-gen → tính key theo id (deterministic, debug dễ).
        // Object key sẽ set ở pass thứ hai vì cần id sau saveAndFlush.
        VetAlbumPhoto entity = new VetAlbumPhoto(vetId, file.getContentType(), file.getSize());
        entity.setCaption(caption);
        entity.setObjectKey("placeholder");  // tạm — sẽ overwrite sau khi có id
        VetAlbumPhoto saved = albumRepository.saveAndFlush(entity);

        String key = "vets/album/" + vetId + "/" + saved.getId();
        try {
            storage.upload(key, file.getContentType(), file.getInputStream(), file.getSize());
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read uploaded file for vet " + vetId, e);
        }
        saved.setObjectKey(key);
        VetAlbumPhoto persisted = albumRepository.save(saved);
        return VetAlbumPhotoResponse.from(persisted,
                storage.presignedGet(key, props.presignedTtl()));
    }

    @Override
    @Transactional
    public void deletePhoto(Long vetId, Long photoId) {
        ensureVetExists(vetId);
        VetAlbumPhoto photo = albumRepository.findByIdAndVetId(photoId, vetId)
                .orElseThrow(() -> new VetAlbumPhotoNotFoundException(photoId.toString()));
        storage.delete(photo.getObjectKey());
        albumRepository.delete(photo);
    }

    private void ensureVetExists(Long vetId) {
        if (!vetRepository.existsById(vetId)) {
            throw new VetNotFoundException(vetId.toString());
        }
    }
}
