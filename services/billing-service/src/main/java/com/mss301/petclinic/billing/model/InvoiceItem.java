package com.mss301.petclinic.billing.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Một dòng chi phí trên hoá đơn. Source-agnostic — gộp phí khám, điều trị theo bệnh,
 * sản phẩm shop, và dòng tự do vào cùng một hoá đơn (xem {@link InvoiceItemSource}).
 *
 * <p>{@link #lineTotal} = {@link #unitPrice} × {@link #quantity}, tính lúc tạo dòng.
 */
@Entity
@Table(name = "invoice_items")
public class InvoiceItem extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private InvoiceItemSource sourceType;

    /** visitId / diseaseId / prescriptionId / productId — nullable cho dòng MISC tự do. */
    @Column(name = "source_ref")
    private Long sourceRef;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal;

    protected InvoiceItem() {
        // JPA
    }

    InvoiceItem(Invoice invoice, InvoiceItemSource sourceType, Long sourceRef,
                String description, BigDecimal unitPrice, int quantity) {
        this.invoice = invoice;
        this.sourceType = sourceType;
        this.sourceRef = sourceRef;
        this.description = description;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
        this.lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    public Long getId() { return id; }
    public Invoice getInvoice() { return invoice; }
    public InvoiceItemSource getSourceType() { return sourceType; }
    public Long getSourceRef() { return sourceRef; }
    public String getDescription() { return description; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public int getQuantity() { return quantity; }
    public BigDecimal getLineTotal() { return lineTotal; }
}
