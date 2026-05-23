package com.mss301.petclinic.vets.service.impl;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.vets.config.StorageProperties;
import com.mss301.petclinic.vets.dto.req.UpdateVetRequest;
import com.mss301.petclinic.vets.dto.req.VetRequest;
import com.mss301.petclinic.vets.dto.res.VetResponse;
import com.mss301.petclinic.vets.exception.VetNotFoundException;
import com.mss301.petclinic.vets.model.Specialty;
import com.mss301.petclinic.vets.model.Vet;
import com.mss301.petclinic.vets.model.VetPhoto;
import com.mss301.petclinic.vets.repository.RatingRepository;
import com.mss301.petclinic.vets.repository.SpecialtyRepository;
import com.mss301.petclinic.vets.repository.VetPhotoRepository;
import com.mss301.petclinic.vets.repository.VetRepository;
import com.mss301.petclinic.vets.repository.VetSpecifications;
import com.mss301.petclinic.vets.service.StorageService;
import com.mss301.petclinic.vets.service.VetService;

@Service
@Transactional(readOnly = true)
public class VetServiceImpl implements VetService {

    private static final String ENTITY_NAME = "vet";

    private final VetRepository vetRepository;
    private final SpecialtyRepository specialtyRepository;
    private final RatingRepository ratingRepository;
    private final VetPhotoRepository photoRepository;
    private final StorageService storage;
    private final StorageProperties props;

    public VetServiceImpl(VetRepository vetRepository, SpecialtyRepository specialtyRepository, RatingRepository ratingRepository, VetPhotoRepository photoRepository, StorageService storage, StorageProperties props) {
        this.vetRepository = vetRepository;
        this.specialtyRepository = specialtyRepository;
        this.ratingRepository = ratingRepository;
        this.photoRepository = photoRepository;
        this.storage = storage;
        this.props = props;
    }

    @Override
    public Page<VetResponse> findAll(String lastName, Long specialtyId, Boolean active, Pageable pageable) {
        Page<Vet> page = vetRepository.findAll(VetSpecifications.filter(lastName, specialtyId, active), pageable);
        if (page.isEmpty()) return page.map(v -> VetResponse.from(v, null, null));

        List<Long> vetIds = page.getContent().stream().map(Vet::getId).toList();
        Map<Long, Double> ratingsMap = new HashMap<>();
        for (Object[] row : ratingRepository.findAverageRatingByVetIds(vetIds)) {
            ratingsMap.put((Long) row[0], (Double) row[1]);
        }

        Map<Long, String> photoMap = new HashMap<>();
        for (VetPhoto p : photoRepository.findAllById(vetIds)) {
            try {
                photoMap.put(p.getVetId(), storage.presignedGet(p.getObjectKey(), props.presignedTtl()).toString());
            } catch (Exception e) { /* ignore */ }
        }

        return page.map(vet -> VetResponse.from(vet, photoMap.get(vet.getId()), ratingsMap.get(vet.getId())));
    }

    @Override
    public VetResponse findById(Long id) {
        return vetRepository.findById(id)
                .map(vet -> {
                    String photoUrl = photoRepository.findById(id)
                            .map(p -> {
                                try {
                                    return storage.presignedGet(p.getObjectKey(), props.presignedTtl()).toString();
                                } catch (Exception e) { return null; }
                            })
                            .orElse(null);
                    Double avg = ratingRepository.findScoreDistributionByVetId(id)
                                .stream()
                                .mapToDouble(row -> ((Number) row[0]).doubleValue() * ((Number) row[1]).longValue())
                                .sum();
                    long count = ratingRepository.countByVetId(id);
                    Double finalAvg = count > 0 ? avg / count : null;
                    return VetResponse.from(vet, photoUrl, finalAvg);
                })
                .orElseThrow(() -> new VetNotFoundException(id.toString()));
    }

    @Override
    @Transactional
    public VetResponse create(VetRequest request) {
        var vet = request.toEntity();
        if (request.specialtyNames() != null && !request.specialtyNames().isEmpty()) {
            vet.setSpecialties(resolveSpecialties(request.specialtyNames()));
        }
        return VetResponse.from(saveAndTranslateUniqueViolation(vet), null, null);
    }

    @Override
    @Transactional
    public VetResponse update(Long id, UpdateVetRequest request) {
        var vet = vetRepository.findById(id)
                .orElseThrow(() -> new VetNotFoundException(id.toString()));

        if (request.hasFirstName()) {
            if (request.firstName().isBlank()) {
                throw new BadRequestAlertException("firstName must not be blank", ENTITY_NAME, "firstName-blank");
            }
            vet.setFirstName(request.firstName());
        }
        if (request.hasLastName()) {
            if (request.lastName().isBlank()) {
                throw new BadRequestAlertException("lastName must not be blank", ENTITY_NAME, "lastName-blank");
            }
            vet.setLastName(request.lastName());
        }
        if (request.hasEmail()) {
            if (request.email().isBlank()) {
                throw new BadRequestAlertException("email must not be blank", ENTITY_NAME, "email-blank");
            }
            vet.setEmail(request.email());
        }
        if (request.hasPhoneNumber()) {
            // empty string = clear phone — cho phép. Validate length đã có ở DTO create (Size 30).
            vet.setPhoneNumber(request.phoneNumber().isBlank() ? null : request.phoneNumber());
        }
        if (request.hasActive()) {
            vet.setActive(request.active());
        }
        if (request.hasResume()) {
            // empty string = clear resume
            vet.setResume(request.resume().isBlank() ? null : request.resume());
        }
        if (request.hasSpecialties()) {
            // Validate elements TRƯỚC khi gọi resolveSpecialties — tránh NPE toLowerCase()
            // trên null/blank entry, trả 400 thay vì 500.
            if (request.specialtyNames().stream().anyMatch(n -> n == null || n.isBlank())) {
                throw new BadRequestAlertException(
                        "specialtyNames must not contain null or blank values",
                        ENTITY_NAME,
                        "specialty-name-invalid"
                );
            }
            // Empty set = clear all; non-empty = REPLACE (không merge với specialty hiện tại)
            vet.setSpecialties(request.specialtyNames().isEmpty()
                    ? new HashSet<>()
                    : resolveSpecialties(request.specialtyNames()));
        }

        String photoUrl = photoRepository.findById(id)
                .map(p -> {
                    try {
                        return storage.presignedGet(p.getObjectKey(), props.presignedTtl()).toString();
                    } catch (Exception e) { return null; }
                })
                .orElse(null);
        Double avg = ratingRepository.findScoreDistributionByVetId(id)
                    .stream()
                    .mapToDouble(row -> ((Number) row[0]).doubleValue() * ((Number) row[1]).longValue())
                    .sum();
        long count = ratingRepository.countByVetId(id);
        Double finalAvg = count > 0 ? avg / count : null;

        return VetResponse.from(saveAndTranslateUniqueViolation(vet), photoUrl, finalAvg);
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        if (!vetRepository.existsById(id)) {
            throw new VetNotFoundException(id.toString());
        }
        vetRepository.deleteById(id);
    }

    /**
     * Save và dịch DB unique violation (email trùng) thành 400 BadRequestAlertException
     * thay vì để 500 leak constraint name ra client. Postgres unique constraint name = uk_vets_email
     * (changeset 003-003) → check message contains.
     */
    private Vet saveAndTranslateUniqueViolation(Vet vet) {
        try {
            return vetRepository.saveAndFlush(vet);
        } catch (DataIntegrityViolationException ex) {
            String msg = ex.getMostSpecificCause().getMessage();
            if (msg != null && msg.contains("uk_vets_email")) {
                throw new BadRequestAlertException(
                        "Email already in use: " + vet.getEmail(),
                        ENTITY_NAME,
                        "email-exists"
                );
            }
            throw ex;
        }
    }

    /**
     * Tìm specialty theo tên (case-insensitive). Nếu một tên không tồn tại → BadRequestAlertException.
     * KHÔNG auto-create để tránh sinh specialty rác. Specialty được seed qua Liquibase.
     */
    private Set<Specialty> resolveSpecialties(Set<String> names) {
        Set<Specialty> found = specialtyRepository.findByNameInIgnoreCase(names);
        if (found.size() != names.size()) {
            Set<String> foundNames = found.stream()
                    .map(s -> s.getName().toLowerCase())
                    .collect(Collectors.toSet());
            Set<String> missing = names.stream()
                    .filter(n -> !foundNames.contains(n.toLowerCase()))
                    .collect(Collectors.toSet());
            throw new BadRequestAlertException(
                    "Unknown specialty names: " + missing,
                    ENTITY_NAME,
                    "specialty-not-found"
            );
        }
        return new HashSet<>(found);
    }
}
