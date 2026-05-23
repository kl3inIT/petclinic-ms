package com.mss301.petclinic.visits.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.visits.client.PetSummary;
import com.mss301.petclinic.visits.client.RemoteClientsFacade;
import com.mss301.petclinic.visits.client.VetAvailabilityResponse;
import com.mss301.petclinic.visits.client.VetSummary;
import com.mss301.petclinic.visits.dto.req.BookVisitRequest;
import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.repository.VisitRepository;
import com.mss301.petclinic.visits.saga.NotificationSagaRepository;

class VisitServiceImplTest {

    private static final ZoneId CLINIC_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final long CUSTOMER_ID = 10L;
    private static final long PET_ID = 20L;
    private static final long VET_ID = 30L;

    private VisitRepository repository;
    private RemoteClientsFacade remoteClients;
    private VisitServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(VisitRepository.class);
        remoteClients = mock(RemoteClientsFacade.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<EventPublisher> events = mock(ObjectProvider.class);
        NotificationSagaRepository sagaRepository = mock(NotificationSagaRepository.class);
        service = new VisitServiceImpl(repository, remoteClients, events, sagaRepository);
    }

    @Test
    void bookRejectsPetOwnedByAnotherCustomer() {
        Instant scheduledAt = slot("2026-05-25T09:00:00+07:00");
        when(remoteClients.fetchVet(VET_ID)).thenReturn(new VetSummary(VET_ID, "Thanh", "Nguyen"));
        when(remoteClients.fetchPet(PET_ID)).thenReturn(new PetSummary(PET_ID, "Milo", "cat", 999L));

        assertThatThrownBy(() -> service.book(
                new BookVisitRequest(PET_ID, VET_ID, scheduledAt, "checkup"), USER_ID, CUSTOMER_ID))
                .isInstanceOf(BadRequestAlertException.class)
                .extracting("errorKey")
                .isEqualTo("pet-owner-mismatch");

        verify(remoteClients, never()).checkVetAvailability(any(), any(), any());
        verify(repository, never()).save(any());
    }

    @Test
    void bookRejectsVetUnavailableSlot() {
        Instant scheduledAt = slot("2026-05-25T09:00:00+07:00");
        when(remoteClients.fetchVet(VET_ID)).thenReturn(new VetSummary(VET_ID, "Thanh", "Nguyen"));
        when(remoteClients.fetchPet(PET_ID)).thenReturn(new PetSummary(PET_ID, "Milo", "cat", CUSTOMER_ID));
        when(remoteClients.checkVetAvailability(VET_ID, "MONDAY", "HOUR_9_10"))
                .thenReturn(new VetAvailabilityResponse(false));

        assertThatThrownBy(() -> service.book(
                new BookVisitRequest(PET_ID, VET_ID, scheduledAt, "checkup"), USER_ID, CUSTOMER_ID))
                .isInstanceOf(BadRequestAlertException.class)
                .extracting("errorKey")
                .isEqualTo("vet-unavailable");

        verify(repository, never()).save(any());
    }

    @Test
    void bookSavesVisitWhenPetOwnerAndVetSlotAreValid() {
        Instant scheduledAt = slot("2026-05-25T09:00:00+07:00");
        when(remoteClients.fetchVet(VET_ID)).thenReturn(new VetSummary(VET_ID, "Thanh", "Nguyen"));
        when(remoteClients.fetchPet(PET_ID)).thenReturn(new PetSummary(PET_ID, "Milo", "cat", CUSTOMER_ID));
        when(remoteClients.checkVetAvailability(VET_ID, "MONDAY", "HOUR_9_10"))
                .thenReturn(new VetAvailabilityResponse(true));
        when(repository.save(any(Visit.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.book(
                new BookVisitRequest(PET_ID, VET_ID, scheduledAt, "checkup"), USER_ID, CUSTOMER_ID);

        assertThat(response.petId()).isEqualTo(PET_ID);
        assertThat(response.vetId()).isEqualTo(VET_ID);
        assertThat(response.customerUserId()).isEqualTo(USER_ID);
        assertThat(response.scheduledAt()).isEqualTo(scheduledAt);
        verify(repository).save(any(Visit.class));
    }

    @Test
    void bookRejectsNonHourlySlot() {
        Instant scheduledAt = slot("2026-05-25T09:30:00+07:00");
        when(remoteClients.fetchVet(VET_ID)).thenReturn(new VetSummary(VET_ID, "Thanh", "Nguyen"));
        when(remoteClients.fetchPet(PET_ID)).thenReturn(new PetSummary(PET_ID, "Milo", "cat", CUSTOMER_ID));

        assertThatThrownBy(() -> service.book(
                new BookVisitRequest(PET_ID, VET_ID, scheduledAt, "checkup"), USER_ID, CUSTOMER_ID))
                .isInstanceOf(BadRequestAlertException.class)
                .extracting("errorKey")
                .isEqualTo("invalid-slot-start");

        verify(remoteClients, never()).checkVetAvailability(any(), any(), any());
        verify(repository, never()).save(any());
    }

    private static Instant slot(String value) {
        return ZonedDateTime.parse(value).withZoneSameInstant(CLINIC_ZONE).toInstant();
    }
}
