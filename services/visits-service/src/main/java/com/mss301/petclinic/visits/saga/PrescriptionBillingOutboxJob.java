package com.mss301.petclinic.visits.saga;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.events.saga.SagaStatus;
import com.mss301.petclinic.visits.events.PrescriptionIssuedEvent;
import com.mss301.petclinic.visits.repository.PrescriptionRepository;
import com.mss301.petclinic.visits.repository.VisitRepository;

/** Durable retry publisher backed by prescription_billing_sagas. */
@Component
public class PrescriptionBillingOutboxJob {

    private static final Logger log = LoggerFactory.getLogger(PrescriptionBillingOutboxJob.class);

    private final PrescriptionBillingSagaRepository sagaRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final VisitRepository visitRepository;
    private final ObjectProvider<EventPublisher> events;

    public PrescriptionBillingOutboxJob(PrescriptionBillingSagaRepository sagaRepository,
                                        PrescriptionRepository prescriptionRepository,
                                        VisitRepository visitRepository,
                                        ObjectProvider<EventPublisher> events) {
        this.sagaRepository = sagaRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.visitRepository = visitRepository;
        this.events = events;
    }

    @Scheduled(fixedDelayString = "${petclinic.outbox.prescription.fixed-delay:30000}")
    @Transactional
    public void republishPending() {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null) {
            return;
        }
        Instant cutoff = Instant.now().minus(30, ChronoUnit.SECONDS);
        for (PrescriptionBillingSaga saga : sagaRepository
                .findTop100ByStatusAndUpdatedAtBeforeOrderByUpdatedAtAsc(SagaStatus.PENDING, cutoff)) {
            republish(publisher, saga);
        }
    }

    private void republish(EventPublisher publisher, PrescriptionBillingSaga saga) {
        var prescription = prescriptionRepository.findById(saga.getPrescriptionId()).orElse(null);
        var visit = visitRepository.findById(saga.getVisitId()).orElse(null);
        if (prescription == null || visit == null) {
            saga.recordPublishAttempt("Prescription or visit no longer exists");
            return;
        }
        var lines = prescription.getItems().stream()
                .filter(item -> item.isPriced())
                .map(item -> new PrescriptionIssuedEvent.Line(
                        item.getProductId(), item.getMedicationName(), item.getUnitPrice(), item.getQuantity()))
                .toList();
        if (lines.isEmpty()) {
            saga.markCompleted();
            return;
        }
        try {
            publisher.publish(PrescriptionIssuedEvent.replay(
                    saga.getEventId(), prescription.getId(), visit.getId(),
                    visit.getCustomerUserId(), null, lines));
            saga.recordPublishAttempt(null);
        } catch (RuntimeException ex) {
            saga.recordPublishAttempt(ex.getMessage());
            log.warn("Republish prescription.issued failed (prescription={}): {}",
                    prescription.getId(), ex.getMessage());
        }
    }
}
