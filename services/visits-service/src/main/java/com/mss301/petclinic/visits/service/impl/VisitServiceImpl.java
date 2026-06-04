package com.mss301.petclinic.visits.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
import org.springframework.web.client.RestClientException;

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.visits.client.OwnerSummary;
import com.mss301.petclinic.visits.client.PetSummary;
import com.mss301.petclinic.visits.client.ProductSummary;
import com.mss301.petclinic.visits.client.RemoteClientsFacade;
import com.mss301.petclinic.visits.client.UserSummary;
import com.mss301.petclinic.visits.client.VetSummary;
import com.mss301.petclinic.visits.client.WorkflowServiceClient;
import com.mss301.petclinic.visits.client.WorkflowStartRequest;
import com.mss301.petclinic.visits.client.WorkflowStartResponse;
import com.mss301.petclinic.visits.config.WorkflowCallbackProperties;
import com.mss301.petclinic.visits.dto.req.BookVisitRequest;
import com.mss301.petclinic.visits.dto.req.CompleteVisitRequest;
import com.mss301.petclinic.visits.dto.res.SlotAvailabilityResponse;
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

    /**
     * Số ca khám active tối đa cho 1 vet trong 1 khung giờ. CANCELLED/COMPLETED
     * không tính. DB UNIQUE (vet_id, scheduled_at) đã được drop ở Liquibase 006
     * — capacity enforce ở app level. Race condition: 2 request đồng thời có thể
     * cùng pass check (cả 2 thấy count=1) → vượt capacity. Chấp nhận risk dev/demo;
     * production cần advisory lock hoặc serializable isolation + retry.
     */
    public static final int SLOT_CAPACITY = 2;

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

        // Enforce SLOT_CAPACITY app-level (DB UNIQUE đã drop ở Liquibase 006).
        // ⚠️ TOCTOU: hai booking song song có thể cùng vượt qua check này. Acceptable cho
        // learning project; production cần pg advisory lock hoặc SERIALIZABLE isolation.
        long activeCount = repository.countActiveByVetIdAndScheduledAt(
                req.vetId(), req.scheduledAt());
        if (activeCount >= SLOT_CAPACITY) {
            throw new SlotTakenException();
        }

        // Snapshot thông tin liên hệ chủ nuôi (best-effort) — pet name/breed/birthDate đã có từ lookup ở trên.
        Visit.OwnerSnapshot ownerSnapshot = new Visit.OwnerSnapshot(null, null);
        try {
            OwnerSummary owner = remoteClients.fetchOwner(pet.ownerId());
            ownerSnapshot = new Visit.OwnerSnapshot(owner.fullName(), owner.telephone());
        } catch (RuntimeException e) {
            log.warn("Enrich owner info thất bại (ownerId={}): {}", pet.ownerId(), e.toString());
        }

        Visit.PetSnapshot petSnapshot = new Visit.PetSnapshot(pet.name(), pet.type(), pet.birthDate());
        Visit visit = Visit.book(req.petId(), petSnapshot, ownerSnapshot, req.vetId(), currentUserId,
                req.scheduledAt(), req.reason());

        Visit saved;
        try {
            saved = repository.save(visit);
        } catch (DataIntegrityViolationException e) {
            // Defense-in-depth: chỉ fire nếu sau này thêm lại partial unique index.
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
        v.complete(req.diagnosis(), req.treatment(), resolveFee(req));
        publishCompleted(v);
        return VisitResponse.from(v);
    }

    /**
     * Phí khám: ưu tiên dịch vụ trong catalog ({@code serviceProductId}, mục SERVICE) →
     * fee = đơn giá catalog; nếu không chọn → dùng {@code fee} nhập tay.
     */
    private BigDecimal resolveFee(CompleteVisitRequest req) {
        if (req.serviceProductId() == null) {
            return req.fee();
        }
        ProductSummary product;
        try {
            product = remoteClients.fetchProduct(req.serviceProductId());
        } catch (HttpClientErrorException.NotFound e) {
            throw new BadRequestAlertException(
                    "Dịch vụ khám không tồn tại: " + req.serviceProductId(), "Visit", "service-not-found");
        }
        if (!"SERVICE".equals(product.type())) {
            throw new BadRequestAlertException(
                    "Mục đã chọn không phải dịch vụ khám", "Visit", "not-a-service");
        }
        return product.unitPrice();
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

    @Override
    public SlotAvailabilityResponse getAvailability(Long vetId, LocalDate date) {
        // Range [00:00, 24:00) ngày local CLINIC_ZONE.
        Instant from = date.atStartOfDay(CLINIC_ZONE).toInstant();
        Instant to = date.plusDays(1).atStartOfDay(CLINIC_ZONE).toInstant();

        List<Visit> active = repository.findActiveByVetIdAndScheduledAtRange(vetId, from, to);

        // Đếm theo work-hour (giờ local). Visit ở các phút != 0 cũng quy về đầu giờ
        // — toBookableSlot() đã enforce phút=0, nhưng defensive vẫn floor.
        Map<Integer, Integer> takenByHour = new HashMap<>();
        for (Visit v : active) {
            int hour = v.getScheduledAt().atZone(CLINIC_ZONE).getHour();
            takenByHour.merge(hour, 1, Integer::sum);
        }

        // Trả về 12 work-hour cố định 8h-20h (kể cả slot 0 taken để FE map dễ).
        List<SlotAvailabilityResponse.SlotInfo> slots = new ArrayList<>();
        for (int h = 8; h <= 19; h++) {
            int taken = takenByHour.getOrDefault(h, 0);
            int remaining = Math.max(0, SLOT_CAPACITY - taken);
            slots.add(new SlotAvailabilityResponse.SlotInfo(
                    "HOUR_" + h + "_" + (h + 1), taken, remaining));
        }
        return new SlotAvailabilityResponse(SLOT_CAPACITY, slots);
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
        WorkflowServiceClient client = workflowClient.getIfAvailable();
        if (client == null) {
            log.debug("WorkflowServiceClient not available — skipping process start for visit {}", saved.getId());
            return;
        }

        WorkflowStartResponse resp;
        try {
            WorkflowStartRequest req = new WorkflowStartRequest(
                    workflowProperties.visitBookingProcessId(),
                    Map.of("visitId", saved.getId())
            );
            resp = client.startProcess(req);
        } catch (RestClientException | IllegalStateException ex) {
            // workflow-service down / no Eureka instance — booking vẫn thành công (best-effort).
            log.warn("workflow-service unavailable — visit {} booked without orchestration: {}",
                    saved.getId(), ex.getMessage());
            return;
        }

        // Response shape sai (null/non-numeric key) là LỖI CONTRACT, không phải outage —
        // log ở mức error (không nuốt im lặng vào warn) nhưng vẫn để booking thành công.
        String key = resp == null ? null : resp.processInstanceKey();
        if (key == null || key.isBlank()) {
            log.error("workflow-service returned no processInstanceKey for visit {} — visit not orchestrated",
                    saved.getId());
            return;
        }
        try {
            saved.setProcessInstanceKey(Long.parseLong(key));
        } catch (NumberFormatException nfe) {
            log.error("workflow-service returned non-numeric processInstanceKey '{}' for visit {} — visit not orchestrated",
                    key, saved.getId());
            return;
        }
        log.info("Started workflow process {} ({}) for visit {}",
                key, workflowProperties.visitBookingProcessId(), saved.getId());
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
