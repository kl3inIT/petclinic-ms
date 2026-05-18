package com.mss301.petclinic.visits.service.impl;

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.common.web.exception.ExternalServiceUnavailableException;
import com.mss301.petclinic.visits.client.CustomersClient;
import com.mss301.petclinic.visits.client.PetSummary;
import com.mss301.petclinic.visits.client.UserSummary;
import com.mss301.petclinic.visits.client.UsersClient;
import com.mss301.petclinic.visits.client.VetSummary;
import com.mss301.petclinic.visits.client.VetsClient;
import com.mss301.petclinic.visits.dto.req.BookVisitRequest;
import com.mss301.petclinic.visits.dto.req.CompleteVisitRequest;
import com.mss301.petclinic.visits.dto.res.VisitResponse;
import com.mss301.petclinic.visits.events.VisitCompletedEvent;
import com.mss301.petclinic.visits.events.VisitScheduledEvent;
import com.mss301.petclinic.visits.exception.SlotTakenException;
import com.mss301.petclinic.visits.exception.VisitNotFoundException;
import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.model.VisitStatus;
import com.mss301.petclinic.visits.repository.VisitRepository;
import com.mss301.petclinic.visits.repository.VisitSpecifications;
import com.mss301.petclinic.visits.service.VisitService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
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

    private static final Logger log = LoggerFactory.getLogger(VisitServiceImpl.class);

    private final VisitRepository repository;
    private final CustomersClient customersClient;
    private final VetsClient vetsClient;
    private final UsersClient usersClient;
    /** Optional — broker có thể disabled (test profile) hoặc tạm down. */
    private final ObjectProvider<EventPublisher> events;

    public VisitServiceImpl(VisitRepository repository,
                            CustomersClient customersClient,
                            VetsClient vetsClient,
                            UsersClient usersClient,
                            ObjectProvider<EventPublisher> events) {
        this.repository = repository;
        this.customersClient = customersClient;
        this.vetsClient = vetsClient;
        this.usersClient = usersClient;
        this.events = events;
    }

    @Override
    @Transactional
    public VisitResponse book(BookVisitRequest req, UUID currentUserId) {
        // Cross-service validation — reuse response cho event enrichment
        VetSummary vet;
        try {
            vet = fetchVet(req.vetId());
        } catch (HttpClientErrorException.NotFound e) {
            throw new BadRequestAlertException(
                    "Vet không tồn tại: " + req.vetId(), "Visit", "vet-not-found");
        }

        PetSummary pet;
        try {
            pet = fetchPet(req.petId());
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

        Visit saved;
        try {
            saved = repository.save(visit);
        } catch (DataIntegrityViolationException e) {
            throw new SlotTakenException();
        }

        publishScheduled(saved, pet, vet, currentUserId);
        return VisitResponse.from(saved);
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
        publishCompleted(v);
        return VisitResponse.from(v);
    }

    @Override
    @Transactional
    public VisitResponse cancel(Long id, UUID currentUserId, boolean privileged) {
        Visit v = loadOrThrow(id);
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

    // ============= Cross-service calls — protected by Resilience4j circuit breaker =============
    // @CircuitBreaker proxies tại bean public surface — phải gọi qua `this` từ method khác trong
    // cùng class WOULD bypass proxy, nhưng Spring AOP với proxy mặc định JDK dynamic vẫn intercept
    // miễn là caller là method PUBLIC của cùng bean → bean reference đi qua proxy.
    // (Đây là lý do fetchPet/fetchVet/fetchUser public dù chỉ dùng nội bộ.)
    //
    // NotFound (404) KHÔNG count vào failure rate — pet/vet không tồn tại là tín hiệu "service
    // healthy + data missing", không phải service xuống. Config trong visits-service.yml:
    //   ignore-exceptions: HttpClientErrorException$NotFound
    //
    // Fallback signature: (sameArgs..., Throwable). Resilience4j chỉ gọi fallback khi exception
    // KHÔNG bị ignore. 404 → vẫn throw lên controller (BadRequestAlertException ở caller).

    @CircuitBreaker(name = "customers-service", fallbackMethod = "fetchPetFallback")
    public PetSummary fetchPet(Long petId) {
        return customersClient.getPet(petId);
    }

    @CircuitBreaker(name = "vets-service", fallbackMethod = "fetchVetFallback")
    public VetSummary fetchVet(Long vetId) {
        return vetsClient.getVet(vetId);
    }

    @CircuitBreaker(name = "auth-service", fallbackMethod = "fetchUserFallback")
    public UserSummary fetchUser(UUID userId) {
        return usersClient.getUser(userId);
    }

    @SuppressWarnings("unused") // referenced by @CircuitBreaker fallbackMethod
    private PetSummary fetchPetFallback(Long petId, Throwable t) {
        log.warn("customers-service circuit OPEN/down (petId={}): {}", petId, t.getMessage());
        throw new ExternalServiceUnavailableException("customers-service", t);
    }

    @SuppressWarnings("unused")
    private VetSummary fetchVetFallback(Long vetId, Throwable t) {
        log.warn("vets-service circuit OPEN/down (vetId={}): {}", vetId, t.getMessage());
        throw new ExternalServiceUnavailableException("vets-service", t);
    }

    @SuppressWarnings("unused")
    private UserSummary fetchUserFallback(UUID userId, Throwable t) {
        log.warn("auth-service circuit OPEN/down (userId={}): {}", userId, t.getMessage());
        throw new ExternalServiceUnavailableException("auth-service", t);
    }

    /**
     * Best-effort publish — exception KHÔNG rollback transaction. Broker down hoặc
     * auth lookup fail thì chỉ log warning. Production cần outbox pattern cho event
     * tiền (invoice/payment); welcome+reminder mất 1 mail chấp nhận được.
     */
    private void publishScheduled(Visit saved, PetSummary pet, VetSummary vet, UUID currentUserId) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null) {
            return;
        }
        try {
            // fetchUser qua circuit breaker — nếu auth-service down, publish fail
            // → catch bên dưới, không rollback visit (event là best-effort).
            UserSummary user = fetchUser(currentUserId);
            publisher.publish(VisitScheduledEvent.of(
                    saved.getId(), saved.getScheduledAt(), saved.getReason(),
                    user.id(), user.username(), user.email(),
                    pet.id(), pet.name(),
                    vet.id(), vet.firstName() + " " + vet.lastName()));
        } catch (RuntimeException ex) {
            log.warn("Publish visit.scheduled failed (visit={}): {}", saved.getId(), ex.getMessage());
        }
    }

    private void publishCompleted(Visit v) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null) {
            return;
        }
        try {
            UserSummary user = fetchUser(v.getCustomerUserId());
            PetSummary pet = fetchPet(v.getPetId());
            VetSummary vet = fetchVet(v.getVetId());
            publisher.publish(VisitCompletedEvent.of(
                    v.getId(), v.getScheduledAt(), Instant.now(),
                    user.id(), user.username(), user.email(),
                    pet.id(), pet.name(),
                    vet.id(), vet.firstName() + " " + vet.lastName(),
                    v.getDiagnosis(), v.getTreatment(), v.getFee()));
        } catch (RuntimeException ex) {
            log.warn("Publish visit.completed failed (visit={}): {}", v.getId(), ex.getMessage());
        }
    }
}
