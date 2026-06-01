package com.mss301.petclinic.billing.service;

import java.math.BigDecimal;
import java.time.Instant;
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
}
