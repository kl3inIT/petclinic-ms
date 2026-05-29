package com.mss301.petclinic.visits.service.impl;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.storage.StorageService;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.visits.client.RemoteClientsFacade;
import com.mss301.petclinic.visits.dto.req.CreatePrescriptionRequest;
import com.mss301.petclinic.visits.dto.res.PrescriptionResponse;
import com.mss301.petclinic.visits.exception.PrescriptionNotFoundException;
import com.mss301.petclinic.visits.exception.VisitNotFoundException;
import com.mss301.petclinic.visits.model.Prescription;
import com.mss301.petclinic.visits.model.PrescriptionItem;
import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.model.VisitStatus;
import com.mss301.petclinic.visits.repository.PrescriptionRepository;
import com.mss301.petclinic.visits.repository.VisitRepository;
import com.mss301.petclinic.visits.service.PrescriptionPdfGenerator;
import com.mss301.petclinic.visits.service.PrescriptionService;

/**
 * Nghiệp vụ đơn thuốc. Quyền truy cập URL khai báo ở {@code VisitsSecurityConfig} +
 * {@code config-repo/visits-service.yml}; kiểm tra theo-instance (vet phụ trách) nằm ở
 * service layer này (đọc role/vetId từ controller truyền xuống).
 */
@Service
@Transactional(readOnly = true)
public class PrescriptionServiceImpl implements PrescriptionService {

    private static final Logger log = LoggerFactory.getLogger(PrescriptionServiceImpl.class);
    private static final String CONTENT_TYPE_PDF = "application/pdf";

    private final VisitRepository visitRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final StorageService storage;
    private final PrescriptionPdfGenerator pdfGenerator;
    private final RemoteClientsFacade remoteClients;

    public PrescriptionServiceImpl(VisitRepository visitRepository,
                                   PrescriptionRepository prescriptionRepository,
                                   StorageService storage,
                                   PrescriptionPdfGenerator pdfGenerator,
                                   RemoteClientsFacade remoteClients) {
        this.visitRepository = visitRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.storage = storage;
        this.pdfGenerator = pdfGenerator;
        this.remoteClients = remoteClients;
    }

    @Override
    @Transactional
    public PrescriptionResponse create(Long visitId, CreatePrescriptionRequest request,
                                       Long vetIdFromJwt, boolean isAdmin) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new VisitNotFoundException(visitId.toString()));

        // 1. Visit phải đang/đã khám mới được kê đơn.
        if (visit.getStatus() != VisitStatus.IN_PROGRESS && visit.getStatus() != VisitStatus.COMPLETED) {
            throw new BadRequestAlertException(
                    "Chỉ kê đơn được cho visit đang khám hoặc đã hoàn tất.",
                    "Prescription", "visit-not-clinical");
        }

        // 2. Chỉ vet phụ trách visit mới được kê (ADMIN bypass).
        if (!isAdmin && !visit.getVetId().equals(vetIdFromJwt)) {
            throw new AccessDeniedException("Chỉ bác sĩ phụ trách visit mới được kê đơn.");
        }

        // 3. Mỗi visit tối đa 1 đơn.
        if (prescriptionRepository.existsByVisitId(visitId)) {
            throw new BadRequestAlertException(
                    "Visit này đã có đơn thuốc.",
                    "Prescription", "already-exists");
        }

        // 4. Build + lưu để lấy id (cần cho object key PDF).
        Long issuedBy = isAdmin && vetIdFromJwt == null ? visit.getVetId() : vetIdFromJwt;
        Prescription rx = Prescription.issue(visitId, issuedBy, blankToNull(request.notes()));
        for (CreatePrescriptionRequest.Item i : request.items()) {
            rx.addItem(new PrescriptionItem(i.medicationName(), i.dosage(), i.frequency(),
                    i.durationDays(), i.instructions()));
        }
        Prescription saved = prescriptionRepository.save(rx);

        // 5. Sinh PDF + upload MinIO. Enrich tên best-effort (không chặn nếu downstream lỗi).
        byte[] pdf = pdfGenerator.render(saved, buildContext(visit));
        String key = "prescriptions/" + visitId + "/" + saved.getId() + ".pdf";
        storage.upload(key, CONTENT_TYPE_PDF, new ByteArrayInputStream(pdf), pdf.length);
        saved.attachPdf(key, CONTENT_TYPE_PDF, pdf.length);

        return PrescriptionResponse.from(saved);
    }

    @Override
    public PrescriptionResponse getByVisitId(Long visitId) {
        return prescriptionRepository.findByVisitId(visitId)
                .map(PrescriptionResponse::from)
                .orElseThrow(() -> new PrescriptionNotFoundException(visitId));
    }

    @Override
    public PrescriptionPdf downloadPdf(Long visitId) {
        Prescription rx = prescriptionRepository.findByVisitId(visitId)
                .orElseThrow(() -> new PrescriptionNotFoundException(visitId));
        if (rx.getObjectKey() == null) {
            // Đơn tồn tại nhưng PDF chưa gắn (lỗi giữa chừng lúc tạo) — coi như chưa có.
            throw new PrescriptionNotFoundException(visitId);
        }
        try (InputStream in = storage.download(rx.getObjectKey())) {
            return new PrescriptionPdf(in.readAllBytes(), "prescription-visit-" + visitId + ".pdf");
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được PDF đơn thuốc visit=" + visitId, e);
        }
    }

    private PrescriptionPdfGenerator.VisitContext buildContext(Visit visit) {
        String vetName = null;
        String petName = null;
        String ownerName = null;
        try {
            var vet = remoteClients.fetchVet(visit.getVetId());
            vetName = (vet.firstName() + " " + vet.lastName()).trim();
        } catch (RuntimeException e) {
            log.warn("Enrich vet name thất bại (vetId={}): {}", visit.getVetId(), e.toString());
        }
        try {
            petName = remoteClients.fetchPet(visit.getPetId()).name();
        } catch (RuntimeException e) {
            log.warn("Enrich pet name thất bại (petId={}): {}", visit.getPetId(), e.toString());
        }
        try {
            ownerName = remoteClients.fetchUser(visit.getCustomerUserId()).username();
        } catch (RuntimeException e) {
            log.warn("Enrich owner name thất bại (userId={}): {}", visit.getCustomerUserId(), e.toString());
        }
        return new PrescriptionPdfGenerator.VisitContext(vetName, petName, ownerName, visit.getScheduledAt());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
