package com.mss301.petclinic.billing.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.billing.dto.req.AddInvoiceItemRequest;
import com.mss301.petclinic.billing.dto.req.CheckoutRequest;
import com.mss301.petclinic.billing.dto.req.CreateInvoiceRequest;
import com.mss301.petclinic.billing.dto.res.InvoiceResponse;
import com.mss301.petclinic.billing.model.InvoiceStatus;

/** Quản lý hoá đơn gộp + thanh toán ở quầy. */
public interface InvoiceService {

    Page<InvoiceResponse> search(UUID customerUserId, InvoiceStatus status,
                                 Instant from, Instant to, Pageable pageable);

    InvoiceResponse getById(Long id);

    /** Mở tab thủ công ở quầy; nếu khách đã có tab OPEN thì trả về tab đó. */
    InvoiceResponse createInvoice(CreateInvoiceRequest request);

    InvoiceResponse addItem(Long invoiceId, AddInvoiceItemRequest request);

    InvoiceResponse removeItem(Long invoiceId, Long itemId);

    InvoiceResponse checkout(Long invoiceId, CheckoutRequest request);

    InvoiceResponse cancel(Long invoiceId);

    /**
     * Bơm phí khám vào tab OPEN của khách (tạo tab nếu chưa có). Idempotent theo visitId.
     * Dùng bởi consumer {@code VisitCompletedEvent}.
     */
    InvoiceResponse appendVisitFee(UUID customerUserId, String customerName,
                                   Long visitId, BigDecimal fee, String description);

    /**
     * Bơm các dòng thuốc kê đơn vào tab OPEN của khách (tạo tab nếu chưa có).
     * Idempotency theo {@code eventId} do consumer đảm bảo. Dùng bởi consumer
     * {@code PrescriptionIssuedEvent}.
     */
    InvoiceResponse appendMedicationItems(UUID customerUserId, String customerName,
                                          List<MedicationLine> lines);

    /** Một dòng thuốc tính tiền (snapshot từ event). */
    record MedicationLine(Long productId, String name, BigDecimal unitPrice, int quantity) {}
}
