package com.mss301.petclinic.visits.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.access.AccessDeniedException;

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.visits.client.FilesClient;
import com.mss301.petclinic.visits.client.RemoteClientsFacade;
import com.mss301.petclinic.visits.dto.req.CreatePrescriptionRequest;
import com.mss301.petclinic.visits.dto.res.PrescriptionResponse;
import com.mss301.petclinic.visits.model.Prescription;
import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.repository.PrescriptionRepository;
import com.mss301.petclinic.visits.repository.VisitRepository;
import com.mss301.petclinic.visits.service.PrescriptionPdfGenerator;

class PrescriptionServiceImplTest {

    private static final long VISIT_ID = 10L;
    private static final long PET_ID = 20L;
    private static final long VET_ID = 30L;
    private static final UUID OWNER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private VisitRepository visitRepository;
    private PrescriptionRepository prescriptionRepository;
    private FilesClient files;
    private PrescriptionPdfGenerator pdfGenerator;
    private RemoteClientsFacade remoteClients;
    private ObjectProvider<EventPublisher> events;
    private PrescriptionServiceImpl service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        visitRepository = mock(VisitRepository.class);
        prescriptionRepository = mock(PrescriptionRepository.class);
        files = mock(FilesClient.class);
        pdfGenerator = mock(PrescriptionPdfGenerator.class);
        remoteClients = mock(RemoteClientsFacade.class);
        events = mock(ObjectProvider.class);
        when(events.getIfAvailable()).thenReturn(null);   // broker off — publish no-op
        service = new PrescriptionServiceImpl(
                visitRepository, prescriptionRepository, files, pdfGenerator, remoteClients, events);
    }

    /** Visit ở trạng thái IN_PROGRESS (đủ điều kiện kê đơn), do VET_ID phụ trách. */
    private static Visit clinicalVisit() {
        Visit v = Visit.book(
                PET_ID,
                new Visit.PetSnapshot("Mun", "Mèo Anh", null),
                new Visit.OwnerSnapshot("Nguyễn Văn A", "0901234567"),
                VET_ID, OWNER_ID, Instant.now().plusSeconds(3600), "checkup");
        v.start(); // SCHEDULED → IN_PROGRESS
        return v;
    }

    private static CreatePrescriptionRequest sampleRequest() {
        return new CreatePrescriptionRequest(
                "uống sau ăn",
                List.of(new CreatePrescriptionRequest.Item(
                        "Amoxicillin", "250mg", "2 lần/ngày", 7, "sau bữa ăn", null, null)));
    }

    @Test
    void createRejectsWhenVetNotAssigned() {
        when(visitRepository.findById(VISIT_ID)).thenReturn(Optional.of(clinicalVisit()));

        // Vet khác (vetId=99) cố kê đơn cho visit của vet 30 → cấm.
        assertThatThrownBy(() -> service.create(VISIT_ID, sampleRequest(), 99L, false))
                .isInstanceOf(AccessDeniedException.class);

        verify(prescriptionRepository, never()).save(any());
        verify(files, never()).upload(anyString(), anyString(), any(byte[].class));
    }

    @Test
    void createRejectsWhenVisitNotClinical() {
        // Visit còn SCHEDULED (chưa khám) → không được kê.
        Visit scheduled = Visit.book(
                PET_ID,
                new Visit.PetSnapshot("Mun", "Mèo Anh", null),
                new Visit.OwnerSnapshot("Nguyễn Văn A", "0901234567"),
                VET_ID, OWNER_ID, Instant.now().plusSeconds(3600), "checkup");
        when(visitRepository.findById(VISIT_ID)).thenReturn(Optional.of(scheduled));

        assertThatThrownBy(() -> service.create(VISIT_ID, sampleRequest(), VET_ID, false))
                .isInstanceOf(BadRequestAlertException.class)
                .extracting("errorKey")
                .isEqualTo("visit-not-clinical");

        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    void createGeneratesPdfAndUploadsWhenVetOwns() {
        when(visitRepository.findById(VISIT_ID)).thenReturn(Optional.of(clinicalVisit()));
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(inv -> inv.getArgument(0));
        when(pdfGenerator.render(any(Prescription.class), any())).thenReturn(new byte[]{'%', 'P', 'D', 'F'});

        PrescriptionResponse response = service.create(VISIT_ID, sampleRequest(), VET_ID, false);

        assertThat(response.visitId()).isEqualTo(VISIT_ID);
        assertThat(response.issuedByVetId()).isEqualTo(VET_ID);
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().medicationName()).isEqualTo("Amoxicillin");
        assertThat(response.pdfAvailable()).isTrue();

        // PDF upload đúng content-type, key bắt đầu bằng prefix prescriptions/<visitId>/
        verify(files).upload(
                eq("prescriptions/" + VISIT_ID + "/null.pdf"),
                eq("application/pdf"),
                any(byte[].class));
    }

    @Test
    void downloadPdfReturnsBytesWhenPresent() {
        Prescription rx = Prescription.issue(VISIT_ID, VET_ID, "notes");
        rx.attachPdf("prescriptions/10/1.pdf", "application/pdf", 4L);
        when(prescriptionRepository.findFirstByVisitIdOrderByIssuedAtDescIdDesc(VISIT_ID))
                .thenReturn(Optional.of(rx));
        when(files.download("prescriptions/10/1.pdf"))
                .thenReturn(new byte[]{'%', 'P', 'D', 'F'});

        var pdf = service.downloadPdf(VISIT_ID);

        assertThat(pdf.content()).hasSize(4);
        assertThat(pdf.filename()).isEqualTo("prescription-visit-10.pdf");
    }
}
