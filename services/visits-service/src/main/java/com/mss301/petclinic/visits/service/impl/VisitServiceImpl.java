package com.mss301.petclinic.visits.service.impl;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.visits.client.CustomersClient;
import com.mss301.petclinic.visits.client.PetSummary;
import com.mss301.petclinic.visits.client.VetsClient;
import com.mss301.petclinic.visits.dto.req.BookVisitRequest;
import com.mss301.petclinic.visits.dto.req.CompleteVisitRequest;
import com.mss301.petclinic.visits.dto.res.VisitResponse;
import com.mss301.petclinic.visits.exception.SlotTakenException;
import com.mss301.petclinic.visits.exception.VisitNotFoundException;
import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.model.VisitStatus;
import com.mss301.petclinic.visits.repository.VisitRepository;
import com.mss301.petclinic.visits.repository.VisitSpecifications;
import com.mss301.petclinic.visits.service.VisitService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;

import java.time.Instant;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class VisitServiceImpl implements VisitService {

    private final VisitRepository repository;
    private final CustomersClient customersClient;
    private final VetsClient vetsClient;

    public VisitServiceImpl(VisitRepository repository,
                            CustomersClient customersClient,
                            VetsClient vetsClient) {
        this.repository = repository;
        this.customersClient = customersClient;
        this.vetsClient = vetsClient;
    }

    @Override
    @Transactional
    public VisitResponse book(BookVisitRequest req, UUID currentUserId) {
        // Cross-service validation #1: vet tồn tại
        try {
            vetsClient.getVet(req.vetId());
        } catch (HttpClientErrorException.NotFound e) {
            throw new BadRequestAlertException(
                    "Vet không tồn tại: " + req.vetId(), "Visit", "vet-not-found");
        }

        // Cross-service validation #2: pet tồn tại
        PetSummary pet;
        try {
            pet = customersClient.getPet(req.petId());
        } catch (HttpClientErrorException.NotFound e) {
            throw new BadRequestAlertException(
                    "Pet không tồn tại: " + req.petId(), "Visit", "pet-not-found");
        }
        if (pet.ownerId() == null) {
            throw new BadRequestAlertException(
                    "Pet không có owner hợp lệ", "Visit", "pet-no-owner");
        }

        Visit visit = Visit.book(req.petId(), req.vetId(), currentUserId,
                req.scheduledAt(), req.reason());

        try {
            return VisitResponse.from(repository.save(visit));
        } catch (DataIntegrityViolationException e) {
            throw new SlotTakenException();
        }
    }

    @Override
    public VisitResponse findById(Long id) {
        return VisitResponse.from(loadOrThrow(id));
    }

    @Override
    public Page<VisitResponse> search(UUID customerFilter, Long vetId, Long petId,
                                       VisitStatus status, Instant from, Instant to,
                                       Pageable pageable) {
        return repository.findAll(
                VisitSpecifications.filter(customerFilter, vetId, petId, status, from, to),
                pageable
        ).map(VisitResponse::from);
    }

    @Override
    @Transactional
    public VisitResponse start(Long id) {
        Visit v = loadOrThrow(id);
        v.start();
        return VisitResponse.from(v);
    }

    @Override
    @Transactional
    public VisitResponse complete(Long id, CompleteVisitRequest req) {
        Visit v = loadOrThrow(id);
        v.complete(req.diagnosis(), req.treatment(), req.fee());
        return VisitResponse.from(v);
    }

    @Override
    @Transactional
    public VisitResponse cancel(Long id, UUID currentUserId, boolean privileged) {
        Visit v = loadOrThrow(id);
        // Ownership rule — domain logic, không phải framework
        if (!privileged && !v.getCustomerUserId().equals(currentUserId)) {
            throw new AccessDeniedException(
                    "Bạn không thể hủy visit của người khác");
        }
        v.cancel();
        return VisitResponse.from(v);
    }

    private Visit loadOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new VisitNotFoundException(id.toString()));
    }
}
