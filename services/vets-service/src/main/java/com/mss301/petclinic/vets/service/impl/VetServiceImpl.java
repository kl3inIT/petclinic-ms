package com.mss301.petclinic.vets.service.impl;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.vets.dto.req.UpdateVetRequest;
import com.mss301.petclinic.vets.dto.req.VetRequest;
import com.mss301.petclinic.vets.dto.res.VetResponse;
import com.mss301.petclinic.vets.exception.VetNotFoundException;
import com.mss301.petclinic.vets.model.Specialty;
import com.mss301.petclinic.vets.repository.SpecialtyRepository;
import com.mss301.petclinic.vets.repository.VetRepository;
import com.mss301.petclinic.vets.repository.VetSpecifications;
import com.mss301.petclinic.vets.service.VetService;

@Service
@Transactional(readOnly = true)
public class VetServiceImpl implements VetService {

    private final VetRepository vetRepository;
    private final SpecialtyRepository specialtyRepository;

    public VetServiceImpl(VetRepository vetRepository, SpecialtyRepository specialtyRepository) {
        this.vetRepository = vetRepository;
        this.specialtyRepository = specialtyRepository;
    }

    @Override
    public Page<VetResponse> findAll(String lastName, Long specialtyId, Pageable pageable) {
        return vetRepository.findAll(VetSpecifications.filter(lastName, specialtyId), pageable)
                .map(VetResponse::from);
    }

    @Override
    public VetResponse findById(Long id) {
        return vetRepository.findById(id)
                .map(VetResponse::from)
                .orElseThrow(() -> new VetNotFoundException(id.toString()));
    }

    @Override
    @Transactional
    public VetResponse create(VetRequest request) {
        var vet = request.toEntity();
        if (request.specialtyNames() != null && !request.specialtyNames().isEmpty()) {
            vet.setSpecialties(resolveSpecialties(request.specialtyNames()));
        }
        return VetResponse.from(vetRepository.save(vet));
    }

    @Override
    @Transactional
    public VetResponse update(Long id, UpdateVetRequest request) {
        var vet = vetRepository.findById(id)
                .orElseThrow(() -> new VetNotFoundException(id.toString()));

        if (request.hasFirstName()) {
            if (request.firstName().isBlank()) {
                throw new BadRequestAlertException("firstName must not be blank", "vet", "firstName-blank");
            }
            vet.setFirstName(request.firstName());
        }
        if (request.hasLastName()) {
            if (request.lastName().isBlank()) {
                throw new BadRequestAlertException("lastName must not be blank", "vet", "lastName-blank");
            }
            vet.setLastName(request.lastName());
        }
        if (request.hasSpecialties()) {
            // Validate elements TRƯỚC khi gọi resolveSpecialties — tránh NPE toLowerCase()
            // trên null/blank entry, trả 400 thay vì 500.
            if (request.specialtyNames().stream().anyMatch(n -> n == null || n.isBlank())) {
                throw new BadRequestAlertException(
                        "specialtyNames must not contain null or blank values",
                        "vet",
                        "specialty-name-invalid"
                );
            }
            // Empty set = clear all; non-empty = REPLACE (không merge với specialty hiện tại)
            vet.setSpecialties(request.specialtyNames().isEmpty()
                    ? new HashSet<>()
                    : resolveSpecialties(request.specialtyNames()));
        }
        return VetResponse.from(vetRepository.save(vet));
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
                    "vet",
                    "specialty-not-found"
            );
        }
        return new HashSet<>(found);
    }
}
