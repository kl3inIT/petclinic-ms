package com.mss301.petclinic.billing.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;

import com.mss301.petclinic.billing.client.ProductSummary;
import com.mss301.petclinic.billing.client.ProductsClient;
import com.mss301.petclinic.billing.dto.req.AddInvoiceItemRequest;
import com.mss301.petclinic.billing.dto.req.CheckoutRequest;
import com.mss301.petclinic.billing.dto.req.CreateInvoiceRequest;
import com.mss301.petclinic.billing.dto.res.InvoiceResponse;
import com.mss301.petclinic.billing.exception.DiseaseNotFoundException;
import com.mss301.petclinic.billing.exception.InvoiceNotFoundException;
import com.mss301.petclinic.billing.model.Disease;
import com.mss301.petclinic.billing.model.Invoice;
import com.mss301.petclinic.billing.model.InvoiceItem;
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

    private static final Logger log = LoggerFactory.getLogger(InvoiceServiceImpl.class);

    private final InvoiceRepository repository;
    private final DiseaseRepository diseaseRepository;
    private final ProductsClient productsClient;

    public InvoiceServiceImpl(InvoiceRepository repository, DiseaseRepository diseaseRepository,
                              ProductsClient productsClient) {
        this.repository = repository;
        this.diseaseRepository = diseaseRepository;
        this.productsClient = productsClient;
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
        } else if (request.sourceType() == InvoiceItemSource.PRODUCT) {
            // Hàng bán lẻ tại quầy — lấy tên + đơn giá từ catalog products-service; kho trừ lúc checkout.
            if (sourceRef == null) {
                throw new BadRequestAlertException(
                        "Thiếu mã sản phẩm (productId) cho dòng PRODUCT", "Invoice", "product-required");
            }
            ProductSummary product = fetchProduct(sourceRef);
            if (!product.active()) {
                throw new BadRequestAlertException(
                        "Sản phẩm đã ngừng kinh doanh: " + product.code(), "Invoice", "product-inactive");
            }
            int qty = request.quantityOrDefault();
            if (product.stockQuantity() != null && product.stockQuantity() < qty) {
                throw new BadRequestAlertException(
                        "Không đủ tồn kho " + product.code() + " (còn " + product.stockQuantity()
                                + ", cần " + qty + ")", "Invoice", "insufficient-stock");
            }
            if (description == null || description.isBlank()) {
                description = product.name();
            }
            unitPrice = product.unitPrice();   // luôn lấy giá catalog, bỏ qua giá client gửi
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

    /** Lấy sản phẩm từ catalog; 404 → BadRequest, lỗi khác → 503 (best-effort caller xử lý). */
    private ProductSummary fetchProduct(Long productId) {
        try {
            return productsClient.getProduct(productId);
        } catch (HttpClientErrorException.NotFound e) {
            throw new BadRequestAlertException(
                    "Sản phẩm không tồn tại trong catalog: " + productId, "Invoice", "product-not-found");
        }
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
        // Bán hàng = checkout → trừ kho cho các dòng PRODUCT (hàng bán lẻ). MEDICATION đã trừ
        // lúc kê đơn nên KHÔNG trừ lại. Best-effort: lỗi products-service chỉ log, không chặn
        // thanh toán (quầy đã giao hàng vật lý) — chỉnh kho tay nếu lệch. ⚠️ dual-write.
        consumeProductStock(invoice);
        invoice.checkout(request.paymentMethod());
        return InvoiceResponse.from(invoice);
    }

    private void consumeProductStock(Invoice invoice) {
        for (InvoiceItem item : invoice.getItems()) {
            if (item.getSourceType() != InvoiceItemSource.PRODUCT || item.getSourceRef() == null) {
                continue;
            }
            try {
                productsClient.consume(item.getSourceRef(),
                        new ProductsClient.StockAdjust(item.getQuantity()));
            } catch (RuntimeException e) {
                log.warn("Trừ kho sản phẩm thất bại (productId={}, qty={}): {} — cần chỉnh tay",
                        item.getSourceRef(), item.getQuantity(), e.toString());
            }
        }
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

    @Override
    @Transactional
    public InvoiceResponse appendMedicationItems(UUID customerUserId, String customerName,
                                                 List<InvoiceService.MedicationLine> lines) {
        Invoice invoice = repository.findFirstByCustomerUserIdAndStatus(customerUserId, InvoiceStatus.OPEN)
                .orElseGet(() -> repository.save(Invoice.open(customerUserId, customerName)));
        for (InvoiceService.MedicationLine line : lines) {
            invoice.addItem(InvoiceItemSource.MEDICATION, line.productId(), line.name(),
                    line.unitPrice() != null ? line.unitPrice() : BigDecimal.ZERO,
                    line.quantity() > 0 ? line.quantity() : 1);
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
