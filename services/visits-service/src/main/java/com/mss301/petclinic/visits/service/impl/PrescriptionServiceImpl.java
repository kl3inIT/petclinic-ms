package com.mss301.petclinic.visits.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.visits.client.FilesClient;
import com.mss301.petclinic.visits.client.ProductSummary;
import com.mss301.petclinic.visits.client.RemoteClientsFacade;
import com.mss301.petclinic.visits.client.UserSummary;
import com.mss301.petclinic.visits.dto.req.CreatePrescriptionRequest;
import com.mss301.petclinic.visits.dto.res.PrescriptionResponse;
import com.mss301.petclinic.visits.events.PrescriptionIssuedEvent;
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
    private final FilesClient files;
    private final PrescriptionPdfGenerator pdfGenerator;
    private final RemoteClientsFacade remoteClients;
    /** Optional — broker có thể disabled (test profile) hoặc tạm down. */
    private final ObjectProvider<EventPublisher> events;

    public PrescriptionServiceImpl(VisitRepository visitRepository,
                                   PrescriptionRepository prescriptionRepository,
                                   FilesClient files,
                                   PrescriptionPdfGenerator pdfGenerator,
                                   RemoteClientsFacade remoteClients,
                                   ObjectProvider<EventPublisher> events) {
        this.visitRepository = visitRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.files = files;
        this.pdfGenerator = pdfGenerator;
        this.remoteClients = remoteClients;
        this.events = events;
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

        // 3. Một visit có thể có nhiều đơn (kê nhiều lần trong điều trị) — không chặn trùng.

        // 4. Build + lưu để lấy id (cần cho object key PDF). Dòng có productId → resolve giá
        //    từ catalog + validate (MEDICATION/active/đủ tồn) trước khi lưu.
        Long issuedBy = isAdmin && vetIdFromJwt == null ? visit.getVetId() : vetIdFromJwt;
        Prescription rx = Prescription.issue(visitId, issuedBy, blankToNull(request.notes()));
        List<PrescriptionIssuedEvent.Line> pricedLines = new ArrayList<>();
        for (CreatePrescriptionRequest.Item i : request.items()) {
            if (i.productId() == null) {
                // Thuốc free-text ngoài catalog — chỉ ghi lâm sàng.
                rx.addItem(new PrescriptionItem(i.medicationName(), i.dosage(), i.frequency(),
                        i.durationDays(), i.instructions()));
                continue;
            }
            if (i.quantity() == null) {
                throw new BadRequestAlertException(
                        "Thiếu số lượng cho thuốc từ catalog", "Prescription", "quantity-required");
            }
            ProductSummary product = fetchMedication(i.productId(), i.quantity());
            rx.addItem(new PrescriptionItem(i.medicationName(), i.dosage(), i.frequency(),
                    i.durationDays(), i.instructions(),
                    product.id(), product.unitPrice(), i.quantity()));
            pricedLines.add(new PrescriptionIssuedEvent.Line(
                    product.id(), i.medicationName(), product.unitPrice(), i.quantity()));
        }
        Prescription saved = prescriptionRepository.save(rx);

        // 5. Sinh PDF + upload qua files-service. Enrich tên best-effort (không chặn nếu downstream lỗi).
        byte[] pdf = pdfGenerator.render(saved, buildContext(visit));
        String key = "prescriptions/" + visitId + "/" + saved.getId() + ".pdf";
        files.upload(key, CONTENT_TYPE_PDF, pdf);
        saved.attachPdf(key, CONTENT_TYPE_PDF, pdf.length);

        // 6. Trừ tồn kho (best-effort — đã pre-check tồn ở bước 4) + publish event để billing
        //    bơm dòng MEDICATION vào hoá đơn. ⚠️ Dual-write: prescription đã lưu là sự thật lâm
        //    sàng; nếu consume/publish lỗi chỉ log (stock có thể chỉnh tay). Production: outbox.
        consumeStock(pricedLines);
        publishIssued(saved, visit, pricedLines);

        return PrescriptionResponse.from(saved);
    }

    /** Lấy + validate thuốc từ catalog: tồn tại, type=MEDICATION, active, đủ tồn kho. */
    private ProductSummary fetchMedication(Long productId, int quantity) {
        ProductSummary product;
        try {
            product = remoteClients.fetchProduct(productId);
        } catch (HttpClientErrorException.NotFound e) {
            throw new BadRequestAlertException(
                    "Thuốc không tồn tại trong catalog: " + productId, "Prescription", "product-not-found");
        }
        if (!"MEDICATION".equals(product.type())) {
            throw new BadRequestAlertException(
                    "Mục đã chọn không phải thuốc: " + product.code(), "Prescription", "not-a-medication");
        }
        if (!product.active()) {
            throw new BadRequestAlertException(
                    "Thuốc đã ngừng kinh doanh: " + product.code(), "Prescription", "product-inactive");
        }
        if (product.stockQuantity() == null || product.stockQuantity() < quantity) {
            throw new BadRequestAlertException(
                    "Không đủ tồn kho " + product.code() + " (còn "
                            + (product.stockQuantity() == null ? 0 : product.stockQuantity())
                            + ", cần " + quantity + ")", "Prescription", "insufficient-stock");
        }
        return product;
    }

    /** Trừ tồn kho từng dòng — best-effort (đã pre-check; race hiếm thì log, không rollback đơn). */
    private void consumeStock(List<PrescriptionIssuedEvent.Line> lines) {
        for (PrescriptionIssuedEvent.Line line : lines) {
            try {
                remoteClients.consumeProduct(line.productId(), line.quantity());
            } catch (RuntimeException e) {
                log.warn("Trừ tồn kho thất bại (productId={}, qty={}): {} — cần chỉnh tay",
                        line.productId(), line.quantity(), e.toString());
            }
        }
    }

    /** Publish prescription.issued (chỉ khi có dòng tính tiền + broker available). */
    private void publishIssued(Prescription saved, Visit visit,
                               List<PrescriptionIssuedEvent.Line> pricedLines) {
        if (pricedLines.isEmpty()) {
            return;
        }
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null) {
            return;
        }
        try {
            String username = null;
            try {
                UserSummary user = remoteClients.fetchUser(visit.getCustomerUserId());
                username = user.username();
            } catch (RuntimeException e) {
                log.warn("Enrich username thất bại (userId={}): {}", visit.getCustomerUserId(), e.toString());
            }
            publisher.publish(PrescriptionIssuedEvent.of(
                    saved.getId(), visit.getId(), visit.getCustomerUserId(), username, pricedLines));
        } catch (RuntimeException ex) {
            log.warn("Publish prescription.issued failed (visit={}): {}", visit.getId(), ex.getMessage());
        }
    }

    @Override
    public PrescriptionResponse getByVisitId(Long visitId) {
        // Visit có thể có nhiều đơn → trả đơn mới nhất.
        return prescriptionRepository.findFirstByVisitIdOrderByIssuedAtDescIdDesc(visitId)
                .map(PrescriptionResponse::from)
                .orElseThrow(() -> new PrescriptionNotFoundException(visitId));
    }

    @Override
    public PrescriptionPdf downloadPdf(Long visitId) {
        Prescription rx = prescriptionRepository.findFirstByVisitIdOrderByIssuedAtDescIdDesc(visitId)
                .orElseThrow(() -> new PrescriptionNotFoundException(visitId));
        if (rx.getObjectKey() == null) {
            // Đơn tồn tại nhưng PDF chưa gắn (lỗi giữa chừng lúc tạo) — coi như chưa có.
            throw new PrescriptionNotFoundException(visitId);
        }
        byte[] pdf = files.download(rx.getObjectKey());
        return new PrescriptionPdf(pdf, "prescription-visit-" + visitId + ".pdf");
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
