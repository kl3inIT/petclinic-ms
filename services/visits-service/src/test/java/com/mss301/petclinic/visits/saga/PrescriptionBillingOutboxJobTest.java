package com.mss301.petclinic.visits.saga;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import com.mss301.petclinic.common.events.DomainEvent;
import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.events.saga.SagaStatus;
import com.mss301.petclinic.visits.events.PrescriptionIssuedEvent;
import com.mss301.petclinic.visits.model.Prescription;
import com.mss301.petclinic.visits.model.PrescriptionItem;
import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.repository.PrescriptionRepository;
import com.mss301.petclinic.visits.repository.VisitRepository;

class PrescriptionBillingOutboxJobTest {

    @Test
    @SuppressWarnings("unchecked")
    void pendingSagaRepublishesSameEventIdAndRecordsAttempt() {
        PrescriptionBillingSagaRepository sagas = mock(PrescriptionBillingSagaRepository.class);
        PrescriptionRepository prescriptions = mock(PrescriptionRepository.class);
        VisitRepository visits = mock(VisitRepository.class);
        ObjectProvider<EventPublisher> events = mock(ObjectProvider.class);
        EventPublisher publisher = mock(EventPublisher.class);
        UUID eventId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID customerId = UUID.fromString("11111111-1111-1111-1111-111111111111");

        Prescription prescription = Prescription.issue(10L, 30L, "notes");
        ReflectionTestUtils.setField(prescription, "id", 77L);
        prescription.addItem(new PrescriptionItem(
                "Amoxicillin", "250mg", "2 lần/ngày", 7, "sau ăn",
                55L, BigDecimal.TEN, 2));
        Visit visit = Visit.book(
                20L, new Visit.PetSnapshot("Mun", null, null),
                new Visit.OwnerSnapshot("Owner", null), 30L, customerId,
                Instant.now().plusSeconds(3600), "checkup");
        ReflectionTestUtils.setField(visit, "id", 10L);
        PrescriptionBillingSaga saga = PrescriptionBillingSaga.start(eventId, 77L, 10L);
        saga.onCreate();

        when(events.getIfAvailable()).thenReturn(publisher);
        when(sagas.findTop100ByStatusAndUpdatedAtBeforeOrderByUpdatedAtAsc(
                eq(SagaStatus.PENDING), any(Instant.class))).thenReturn(List.of(saga));
        when(prescriptions.findById(77L)).thenReturn(Optional.of(prescription));
        when(visits.findById(10L)).thenReturn(Optional.of(visit));
        PrescriptionBillingOutboxJob job = new PrescriptionBillingOutboxJob(
                sagas, prescriptions, visits, events);

        job.republishPending();

        ArgumentCaptor<DomainEvent> event = ArgumentCaptor.forClass(DomainEvent.class);
        verify(publisher).publish(event.capture());
        assertThat(event.getValue()).isInstanceOfSatisfying(PrescriptionIssuedEvent.class, replay -> {
            assertThat(replay.eventId()).isEqualTo(eventId);
            assertThat(replay.lines()).singleElement().satisfies(line -> {
                assertThat(line.productId()).isEqualTo(55L);
                assertThat(line.quantity()).isEqualTo(2);
            });
        });
        assertThat(saga.getAttempts()).isEqualTo(1);
        assertThat(saga.getStatus()).isEqualTo(SagaStatus.PENDING);
    }
}
