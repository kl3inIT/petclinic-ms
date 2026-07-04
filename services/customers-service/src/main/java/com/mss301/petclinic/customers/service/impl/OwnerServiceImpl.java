package com.mss301.petclinic.customers.service.impl;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.common.events.DomainEvent;
import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.customers.client.FilesClient;
import com.mss301.petclinic.customers.dto.req.OwnerRequest;
import com.mss301.petclinic.customers.dto.req.PetRequest;
import com.mss301.petclinic.customers.dto.req.UpdateOwnerRequest;
import com.mss301.petclinic.customers.dto.res.OwnerResponse;
import com.mss301.petclinic.customers.events.OwnerCreatedEvent;
import com.mss301.petclinic.customers.events.OwnerDeletedEvent;
import com.mss301.petclinic.customers.events.OwnerUpdatedEvent;
import com.mss301.petclinic.customers.events.PetAddedEvent;
import com.mss301.petclinic.customers.events.PetRemovedEvent;
import com.mss301.petclinic.customers.events.PetUpdatedEvent;
import com.mss301.petclinic.customers.exception.OwnerNotFoundException;
import com.mss301.petclinic.customers.exception.PetNotFoundException;
import com.mss301.petclinic.customers.model.Owner;
import com.mss301.petclinic.customers.model.Pet;
import com.mss301.petclinic.customers.repository.OwnerRepository;
import com.mss301.petclinic.customers.service.OwnerService;
import com.mss301.petclinic.customers.service.PetTypeService;

@Service
@Transactional(readOnly = true)
public class OwnerServiceImpl implements OwnerService {

    private static final Logger log = LoggerFactory.getLogger(OwnerServiceImpl.class);
    private static final String PET_PHOTO_ENTITY = "pet-photo";
    private static final String OWNER_AVATAR_ENTITY = "owner-avatar";

    private final OwnerRepository repository;
    private final PetTypeService petTypeService;
    private final FilesClient files;
    /**
     * {@code ObjectProvider} cho phép service hoạt động khi
     * {@code petclinic.events.enabled=false} (test profile) — broker không cần.
     */
    private final ObjectProvider<EventPublisher> eventPublisherProvider;

    public OwnerServiceImpl(OwnerRepository repository,
                            PetTypeService petTypeService,
                            FilesClient files,
                            ObjectProvider<EventPublisher> eventPublisherProvider) {
        this.repository = repository;
        this.petTypeService = petTypeService;
        this.files = files;
        this.eventPublisherProvider = eventPublisherProvider;
    }

    /** object key → presigned URL string; null/blank key → null (chưa có ảnh). */
    private String presign(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        return files.presignedUrl(key);
    }

    private OwnerResponse toResponse(Owner owner) {
        return OwnerResponse.from(owner, this::presign);
    }

    @Override
    public Page<OwnerResponse> findAll(String lastName, Pageable pageable) {
        var page = (lastName == null || lastName.isBlank())
                ? repository.findAll(pageable)
                : repository.findByLastNameContainingIgnoreCase(lastName, pageable);
        return page.map(this::toResponse);
    }

    @Override
    public OwnerResponse findById(Long id) {
        return repository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new OwnerNotFoundException(id.toString()));
    }

    @Override
    @Transactional
    public OwnerResponse create(OwnerRequest request) {
        var saved = repository.save(request.toEntity());
        publishAfterCommit(OwnerCreatedEvent.of(
                saved.getId(), saved.getFirstName(), saved.getLastName(),
                saved.getCity(), saved.getTelephone()));
        return toResponse(saved);
    }

    @Override
    @Transactional
    public OwnerResponse update(Long id, UpdateOwnerRequest request) {
        var owner = repository.findById(id)
                .orElseThrow(() -> new OwnerNotFoundException(id.toString()));

        if (request.firstName() != null && !request.firstName().isBlank()) {
            owner.setFirstName(request.firstName());
        }
        if (request.lastName() != null && !request.lastName().isBlank()) {
            owner.setLastName(request.lastName());
        }
        if (request.address() != null) {
            owner.setAddress(blankToNull(request.address()));
        }
        if (request.city() != null) {
            owner.setCity(blankToNull(request.city()));
        }
        if (request.telephone() != null) {
            owner.setTelephone(blankToNull(request.telephone()));
        }
        publishAfterCommit(OwnerUpdatedEvent.of(
                owner.getId(), owner.getFirstName(), owner.getLastName(),
                owner.getCity(), owner.getTelephone()));
        return toResponse(owner);
    }

    @Override
    @Transactional
    public OwnerResponse addPet(Long ownerId, PetRequest request) {
        var owner = repository.findById(ownerId)
                .orElseThrow(() -> new OwnerNotFoundException(ownerId.toString()));
        petTypeService.resolve(request.petTypeId());  // validate trước khi save
        var pet = request.toEntity();
        owner.addPet(pet);
        var saved = repository.saveAndFlush(owner);
        publishAfterCommit(PetAddedEvent.of(
                pet.getId(), saved.getId(), pet.getName(), pet.getType(), pet.getPetTypeId()));
        return toResponse(saved);
    }

    @Override
    @Transactional
    public OwnerResponse updatePet(Long ownerId, Long petId, PetRequest request) {
        var owner = repository.findById(ownerId)
                .orElseThrow(() -> new OwnerNotFoundException(ownerId.toString()));
        var pet = owner.getPets().stream()
                .filter(candidate -> petId.equals(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new PetNotFoundException(petId.toString()));
        petTypeService.resolve(request.petTypeId());  // validate

        pet.setName(request.name());
        pet.setBirthDate(request.birthDate());
        pet.setType(request.type());
        pet.setPetTypeId(request.petTypeId());
        pet.setIsActive(request.isActive() == null ? true : request.isActive());
        pet.setWeight(request.weight());
        pet.setPhotoId(request.photoId());
        publishAfterCommit(PetUpdatedEvent.of(
                pet.getId(), owner.getId(), pet.getName(), pet.getType(),
                pet.getPetTypeId(), pet.getIsActive()));
        return toResponse(owner);
    }

    @Override
    @Transactional
    public void removePet(Long ownerId, Long petId) {
        var owner = repository.findById(ownerId)
                .orElseThrow(() -> new OwnerNotFoundException(ownerId.toString()));
        var pet = owner.getPets().stream()
                .filter(candidate -> petId.equals(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new PetNotFoundException(petId.toString()));
        owner.removePet(pet);
        publishAfterCommit(PetRemovedEvent.of(pet.getId(), owner.getId()));
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        var owner = repository.findById(id)
                .orElseThrow(() -> new OwnerNotFoundException(id.toString()));
        // Snapshot petIds trước khi cascade xóa — consumer cần để compensate.
        List<Long> petIds = owner.getPets().stream().map(Pet::getId).toList();
        repository.delete(owner);
        publishAfterCommit(OwnerDeletedEvent.of(id, petIds));
    }

    @Override
    @Transactional
    public OwnerResponse uploadPetPhoto(Long ownerId, Long petId, MultipartFile file) {
        var owner = repository.findById(ownerId)
                .orElseThrow(() -> new OwnerNotFoundException(ownerId.toString()));
        var pet = owner.getPets().stream()
                .filter(candidate -> petId.equals(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new PetNotFoundException(petId.toString()));
        MediaValidator.validate(file, PET_PHOTO_ENTITY, files.maxFileSizeBytes());

        // Key cố định theo petId → re-upload overwrite object cũ (idempotent). Ghi file
        // trước, set photoId sau. Nếu file ghi xong mà DB fail → @Transactional rollback
        // photoId (DB) nhưng object mới đã đè; re-upload sẽ retry idempotent.
        String key = "pets/" + petId;
        uploadToStorage(key, file, PET_PHOTO_ENTITY);
        pet.setPhotoId(key);
        return toResponse(owner);
    }

    @Override
    @Transactional
    public OwnerResponse deletePetPhoto(Long ownerId, Long petId) {
        var owner = repository.findById(ownerId)
                .orElseThrow(() -> new OwnerNotFoundException(ownerId.toString()));
        var pet = owner.getPets().stream()
                .filter(candidate -> petId.equals(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new PetNotFoundException(petId.toString()));
        if (pet.getPhotoId() != null) {
            // Xoá file trước, clear DB sau — fail files-service → giữ photoId, retry được.
            files.delete(pet.getPhotoId());
            pet.setPhotoId(null);
        }
        return toResponse(owner);
    }

    @Override
    @Transactional
    public OwnerResponse uploadOwnerAvatar(Long ownerId, MultipartFile file) {
        var owner = repository.findById(ownerId)
                .orElseThrow(() -> new OwnerNotFoundException(ownerId.toString()));
        MediaValidator.validate(file, OWNER_AVATAR_ENTITY, files.maxFileSizeBytes());

        String key = "owners/" + ownerId;
        uploadToStorage(key, file, OWNER_AVATAR_ENTITY);
        owner.setAvatarObjectKey(key);
        return toResponse(owner);
    }

    @Override
    @Transactional
    public OwnerResponse deleteOwnerAvatar(Long ownerId) {
        var owner = repository.findById(ownerId)
                .orElseThrow(() -> new OwnerNotFoundException(ownerId.toString()));
        if (owner.getAvatarObjectKey() != null) {
            files.delete(owner.getAvatarObjectKey());
            owner.setAvatarObjectKey(null);
        }
        return toResponse(owner);
    }

    private void uploadToStorage(String key, MultipartFile file, String entityName) {
        try {
            files.upload(key, file);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read uploaded file for " + entityName + " " + key, e);
        }
    }

    /**
     * Defer publish đến sau khi transaction commit thành công. Tránh dual-write
     * inconsistency: nếu DB rollback sau khi event đã gửi, consumer xử lý event
     * cho state không tồn tại.
     *
     * <p>Trường hợp gọi ngoài transaction (vd test gọi service trực tiếp) → publish
     * ngay, log warning. Production: luôn có @Transactional ngoài.
     */
    private void publishAfterCommit(DomainEvent event) {
        EventPublisher publisher = eventPublisherProvider.getIfAvailable();
        if (publisher == null) {
            log.debug("EventPublisher disabled (petclinic.events.enabled=false?) — skip {}", event.eventType());
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publisher.publish(event);
                }
            });
        } else {
            log.warn("publishAfterCommit called outside transaction — publish immediately: {}", event.eventType());
            publisher.publish(event);
        }
    }

    private static String blankToNull(String value) {
        return value.isBlank() ? null : value;
    }
}
