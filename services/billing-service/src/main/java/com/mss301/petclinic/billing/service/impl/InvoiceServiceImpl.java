package com.mss301.petclinic.billing.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.billing.dto.req.AddInvoiceItemRequest;
import com.mss301.petclinic.billing.dto.req.CheckoutRequest;
import com.mss301.petclinic.billing.dto.req.CreateInvoiceRequest;
import com.mss301.petclinic.billing.dto.res.InvoiceResponse;
import com.mss301.petclinic.billing.exception.DiseaseNotFoundException;
import com.mss301.petclinic.billing.exception.InvoiceNotFoundException;
import com.mss301.petclinic.billing.model.Disease;
import com.mss301.petclinic.billing.model.Invoice;
import com.mss301.petclinic.billing.model.InvoiceItemSource;
import com.mss301.petclinic.billing.model.InvoiceStatus;
import com.mss301.petclinic.billing.repository.DiseaseRepository;
import com.mss301.petclinic.billing.repository.InvoiceRepository;
import com.mss301.petclinic.billing.repository.InvoiceSpecifications;
import com.mss301.petclinic.billing.service.InvoiceService;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

@Service
@Transactional(readOnly = true)
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository repository;
    private final DiseaseRepository diseaseRepository;

    public InvoiceServiceImpl(InvoiceRepository repository, DiseaseRepository diseaseRepository) {
        this.repository = repository;
        this.diseaseRepository = diseaseRepository;
    }

    @Override
    public Page<InvoiceResponse> search(UUID customerUserId, InvoiceStatus status,
                                        Instant from, Instant to, Pageable pageable) {
        return repository.findAll(
                InvoiceSpecifications.filter(customerUserId, status, from, to), pageable)
                .map(InvoiceResponse::from);
    }

    @Override
    public InvoiceResponse getById(Long id) {
        return InvoiceResponse.from(loadOrThrow(id));
    }

    @Override
    @Transactional
    public InvoiceResponse createInvoice(CreateInvoiceRequest request) {
        // Đã có tab OPEN cho khách → trả về tab đó (tránh vi phạm partial unique index).
        if (request.customerUserId() != null) {
            var existing = repository.findFirstByCustomerUserIdAndStatus(
                    request.customerUserId(), InvoiceStatus.OPEN);
            if (existing.isPresent()) {
                return InvoiceResponse.from(existing.get());
            }
        }
        Invoice invoice = Invoice.open(request.customerUserId(), request.customerName());
        if (request.notes() != null) {
            invoice.setNotes(request.notes());
        }
        return InvoiceResponse.from(repository.save(invoice));
    }

    @Override
    @Transactional
    public InvoiceResponse addItem(Long invoiceId, AddInvoiceItemRequest request) {
        Invoice invoice = loadOrThrow(invoiceId);
        requireOpen(invoice);

        String description = request.description();
        BigDecimal unitPrice = request.unitPrice();
        Long sourceRef = request.sourceRef();

        if (request.sourceType() == InvoiceItemSource.DISEASE) {
            if (sourceRef == null) {
                throw new BadRequestAlertException(
                        "Thiếu mã bệnh (diseaseId) cho dòng DISEASE", "Invoice", "disease-required");
            }
            Disease disease = diseaseRepository.findById(sourceRef)
                    .orElseThrow(() -> new DiseaseNotFoundException(String.valueOf(request.sourceRef())));
            if (description == null || description.isBlank()) {
                description = disease.getName();
            }
            if (unitPrice == null) {
                unitPrice = disease.getBaseCost();
            }
        } else {
            if (description == null || description.isBlank()) {
                throw new BadRequestAlertException(
                        "Thiếu mô tả dòng", "Invoice", "description-required");
            }
            if (unitPrice == null) {
                throw new BadRequestAlertException(
                        "Thiếu đơn giá", "Invoice", "unit-price-required");
            }
        }

        invoice.addItem(request.sourceType(), sourceRef, description, unitPrice, request.quantityOrDefault());
        return InvoiceResponse.from(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse removeItem(Long invoiceId, Long itemId) {
        Invoice invoice = loadOrThrow(invoiceId);
        requireOpen(invoice);
        boolean removed = invoice.removeItem(itemId);
        if (!removed) {
            throw new BadRequestAlertException(
                    "Dòng không tồn tại trong hoá đơn: " + itemId, "Invoice", "item-not-found");
        }
        return InvoiceResponse.from(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse checkout(Long invoiceId, CheckoutRequest request) {
        Invoice invoice = loadOrThrow(invoiceId);
        requireOpen(invoice);
        if (invoice.getItems().isEmpty()) {
            throw new BadRequestAlertException(
                    "Hoá đơn trống — không thể thanh toán", "Invoice", "invoice-empty");
        }
        invoice.checkout(request.paymentMethod());
        return InvoiceResponse.from(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse cancel(Long invoiceId) {
        Invoice invoice = loadOrThrow(invoiceId);
        requireOpen(invoice);
        invoice.cancel();
        return InvoiceResponse.from(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse appendVisitFee(UUID customerUserId, String customerName,
                                          Long visitId, BigDecimal fee, String description) {
        Invoice invoice = repository.findFirstByCustomerUserIdAndStatus(customerUserId, InvoiceStatus.OPEN)
                .orElseGet(() -> repository.save(Invoice.open(customerUserId, customerName)));
        if (!invoice.hasVisitFee(visitId)) {
            invoice.addItem(InvoiceItemSource.VISIT_FEE, visitId, description,
                    fee != null ? fee : BigDecimal.ZERO, 1);
        }
        return InvoiceResponse.from(invoice);
    }

    private Invoice loadOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new InvoiceNotFoundException(String.valueOf(id)));
    }

    private void requireOpen(Invoice invoice) {
        if (!invoice.isOpen()) {
            throw new BadRequestAlertException(
                    "Hoá đơn đã chốt (" + invoice.getStatus() + ") — không thể chỉnh sửa",
                    "Invoice", "invoice-not-open");
        }
    }
}
