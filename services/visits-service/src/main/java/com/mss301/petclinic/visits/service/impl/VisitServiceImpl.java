package com.mss301.petclinic.visits.service.impl;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;

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

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.visits.client.PetSummary;
import com.mss301.petclinic.visits.client.RemoteClientsFacade;
import com.mss301.petclinic.visits.client.UserSummary;
import com.mss301.petclinic.visits.client.VetSummary;
import com.mss301.petclinic.visits.client.WorkflowServiceClient;
import com.mss301.petclinic.visits.client.WorkflowStartRequest;
import com.mss301.petclinic.visits.client.WorkflowStartResponse;
import com.mss301.petclinic.visits.config.WorkflowCallbackProperties;
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
import com.mss301.petclinic.visits.saga.NotificationSaga;
import com.mss301.petclinic.visits.saga.NotificationSagaRepository;
import com.mss301.petclinic.visits.service.VisitService;

@Service
@Transactional(readOnly = true)
public class VisitServiceImpl implements VisitService {

    private static final Logger log = LoggerFactory.getLogger(VisitServiceImpl.class);
    private static final ZoneId CLINIC_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final VisitRepository repository;
    /** Cross-service calls qua bean tách riêng — bean boundary cần thiết để Spring AOP
     *  intercept {@code @CircuitBreaker} (gọi {@code this.remoteClients.fetchPet(...)} trong cùng class
     *  sẽ bypass proxy → annotation không kick in). */
    private final RemoteClientsFacade remoteClients;
    /** Optional — broker có thể disabled (test profile) hoặc tạm down. */
    private final ObjectProvider<EventPublisher> events;
    /** Optional — workflow-service có thể chưa start hoặc down. Booking vẫn thành công. */
    private final ObjectProvider<WorkflowServiceClient> workflowClient;
    private final WorkflowCallbackProperties workflowProperties;
    /** Saga state — track notification choreography per VisitCompletedEvent. Null khi broker disabled. */
    private final NotificationSagaRepository sagaRepo;

    public VisitServiceImpl(VisitRepository repository,
                            RemoteClientsFacade remoteClients,
                            ObjectProvider<EventPublisher> events,
                            ObjectProvider<WorkflowServiceClient> workflowClient,
                            WorkflowCallbackProperties workflowProperties,
                            NotificationSagaRepository sagaRepo) {
        this.repository = repository;
        this.remoteClients = remoteClients;
        this.events = events;
        this.workflowClient = workflowClient;
        this.workflowProperties = workflowProperties;
        this.sagaRepo = sagaRepo;
    }

    @Override
    @Transactional
    public VisitResponse book(BookVisitRequest req, UUID currentUserId, Long currentCustomerId) {
        if (currentCustomerId == null) {
            throw new BadRequestAlertException(
                    "Tài khoản chưa được link với hồ sơ khách hàng", "Visit", "customer-link-required");
        }

        // Cross-service validation — reuse response cho event enrichment
        VetSummary vet;
        try {
            vet = remoteClients.fetchVet(req.vetId());
        } catch (HttpClientErrorException.NotFound e) {
            throw new BadRequestAlertException(
                    "Vet không tồn tại: " + req.vetId(), "Visit", "vet-not-found");
        }

        PetSummary pet;
        try {
            pet = remoteClients.fetchPet(req.petId());
        } catch (HttpClientErrorException.NotFound e) {
            throw new BadRequestAlertException(
                    "Pet không tồn tại: " + req.petId(), "Visit", "pet-not-found");
        }
        if (pet.ownerId() == null) {
            throw new BadRequestAlertException(
                    "Pet không có owner hợp lệ", "Visit", "pet-no-owner");
        }
        if (!pet.ownerId().equals(currentCustomerId)) {
            throw new BadRequestAlertException(
                    "Bạn chỉ có thể đặt lịch cho thú cưng của mình", "Visit", "pet-owner-mismatch");
        }

        Slot slot = toBookableSlot(req.scheduledAt());
        if (!remoteClients.checkVetAvailability(req.vetId(), slot.workday(), slot.workHour()).available()) {
            throw new BadRequestAlertException(
                    "Bác sĩ không có lịch làm việc vào khung giờ đã chọn",
                    "Visit",
                    "vet-unavailable");
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
        startWorkflowProcess(saved);
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

    private static Slot toBookableSlot(Instant scheduledAt) {
        ZonedDateTime local = scheduledAt.atZone(CLINIC_ZONE);
        if (local.getMinute() != 0 || local.getSecond() != 0 || local.getNano() != 0) {
            throw new BadRequestAlertException(
                    "Thời gian khám phải bắt đầu đúng đầu giờ", "Visit", "invalid-slot-start");
        }
        int hour = local.getHour();
        if (hour < 8 || hour > 19) {
            throw new BadRequestAlertException(
                    "Thời gian khám phải nằm trong khung 08:00-20:00", "Visit", "invalid-work-hour");
        }
        return new Slot(toWorkday(local), "HOUR_" + hour + "_" + (hour + 1));
    }

    private static String toWorkday(ZonedDateTime local) {
        return switch (local.getDayOfWeek()) {
            case MONDAY -> "MONDAY";
            case TUESDAY -> "TUESDAY";
            case WEDNESDAY -> "WEDNESDAY";
            case THURSDAY -> "THURSDAY";
            case FRIDAY -> "FRIDAY";
            case SATURDAY -> "SATURDAY";
            case SUNDAY -> "SUNDAY";
        };
    }

    private record Slot(String workday, String workHour) {
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
            UserSummary user = remoteClients.fetchUser(currentUserId);
            publisher.publish(VisitScheduledEvent.of(
                    saved.getId(), saved.getScheduledAt(), saved.getReason(),
                    user.id(), user.username(), user.email(),
                    pet.id(), pet.name(),
                    vet.id(), vet.firstName() + " " + vet.lastName()));
        } catch (RuntimeException ex) {
            log.warn("Publish visit.scheduled failed (visit={}): {}", saved.getId(), ex.getMessage());
        }
    }

    /**
     * Best-effort — nếu workflow-service down, booking vẫn thành công.
     * Visit sẽ không có processInstanceKey và không được Camunda điều phối.
     * Fallback: dùng public /start và /complete endpoints trực tiếp.
     */
    private void startWorkflowProcess(Visit saved) {
        try {
            WorkflowServiceClient client = workflowClient.getIfAvailable();
            if (client == null) {
                log.debug("WorkflowServiceClient not available — skipping process start for visit {}", saved.getId());
                return;
            }
            WorkflowStartRequest req = new WorkflowStartRequest(
                    workflowProperties.visitBookingProcessId(),
                    Map.of("visitId", saved.getId())
            );
            WorkflowStartResponse resp = client.startProcess(req);
            saved.setProcessInstanceKey(Long.parseLong(resp.processInstanceKey()));
            log.info("Started workflow process {} ({}) for visit {}",
                    resp.processInstanceKey(), workflowProperties.visitBookingProcessId(), saved.getId());
        } catch (Exception ex) {
            log.warn("Failed to start workflow process for visit {}: {}", saved.getId(), ex.getMessage());
        }
    }

    private void publishCompleted(Visit v) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null) {
            return;
        }
        try {
            UserSummary user = remoteClients.fetchUser(v.getCustomerUserId());
            PetSummary pet = remoteClients.fetchPet(v.getPetId());
            VetSummary vet = remoteClients.fetchVet(v.getVetId());
            VisitCompletedEvent event = VisitCompletedEvent.of(
                    v.getId(), v.getScheduledAt(), Instant.now(),
                    user.id(), user.username(), user.email(),
                    pet.id(), pet.name(),
                    vet.id(), vet.firstName() + " " + vet.lastName(),
                    v.getDiagnosis(), v.getTreatment(), v.getFee());

            // Saga state — record TRƯỚC publish để mailer ack arrive nhanh hơn vẫn match được row.
            // Cùng @Transactional với Visit.complete() → atomic giữa DB write của Visit + saga.
            //
            // ⚠️ KHÔNG fully atomic với broker (dual-write problem):
            //   - DB commit OK + broker publish FAIL → saga PENDING orphan, không bao giờ resolve
            //   - DB commit FAIL + broker publish OK → mailer ack nhưng saga row không tồn tại
            // Production cần Transactional Outbox: ghi event vào bảng outbox cùng TX,
            // poller riêng publish → broker với retry. Reference: microservices.io/patterns/data/transactional-outbox
            sagaRepo.save(NotificationSaga.start(
                    event.eventId(), v.getId(), "visit.completed.notification"));

            publisher.publish(event);
        } catch (RuntimeException ex) {
            log.warn("Publish visit.completed failed (visit={}): {}", v.getId(), ex.getMessage());
        }
    }
}
