package com.mss301.petclinic.billing.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Hoá đơn gộp — "tab mở" của một khách. Gộp mọi chi phí (phí khám, điều trị theo bệnh,
 * sản phẩm shop, dòng tự do) vào MỘT hoá đơn rồi thanh toán một lần ở quầy.
 *
 * <h4>Aggregate</h4>
 * Root quản lý vòng đời {@link InvoiceItem} (cascade ALL + orphanRemoval). Mọi thay đổi
 * dòng đi qua {@link #addItem}/{@link #removeItem} để {@link #subtotal}/{@link #total}
 * luôn nhất quán (recompute sau mỗi mutation).
 *
 * <h4>Bất biến "1 tab mở/khách"</h4>
 * Partial unique index {@code uk_invoices_open_per_customer} đảm bảo tối đa 1 hoá đơn
 * {@code OPEN} cho mỗi {@code customer_user_id}. Charge mới append vào tab đang mở.
 *
 * <h4>State</h4>
 * Chỉ sửa được dòng khi {@code OPEN}. {@link #checkout}/{@link #cancel} chốt hoá đơn (terminal).
 */
@Entity
@Table(name = "invoices")
public class Invoice extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_user_id")
    private UUID customerUserId;

    @Column(name = "customer_name", length = 150)
    private String customerName;

    @Column(name = "customer_email", length = 100)
    private String customerEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvoiceStatus status;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 20)
    private PaymentMethod paymentMethod;

    @Column(name = "payment_reference", length = 120)
    private String paymentReference;

    @Version
    private Long version;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<InvoiceItem> items = new ArrayList<>();

    protected Invoice() {
        // JPA
    }

    private Invoice(UUID customerUserId, String customerName, String customerEmail) {
        this.customerUserId = customerUserId;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.status = InvoiceStatus.OPEN;
        this.currency = "VND";
        this.subtotal = BigDecimal.ZERO;
        this.total = BigDecimal.ZERO;
        this.issuedAt = Instant.now();
    }

    /** Mở một tab mới (status OPEN) cho khách. */
    public static Invoice open(UUID customerUserId, String customerName, String customerEmail) {
        return new Invoice(customerUserId, customerName, customerEmail);
    }

    /** Backward-compatible factory cho call sites/test không có email snapshot. */
    public static Invoice open(UUID customerUserId, String customerName) {
        return open(customerUserId, customerName, null);
    }

    /** Thêm một dòng chi phí. Yêu cầu status OPEN. Trả về dòng vừa tạo. */
    public InvoiceItem addItem(InvoiceItemSource sourceType, Long sourceRef,
                               String description, BigDecimal unitPrice, int quantity) {
        requireOpen();
        InvoiceItem item = new InvoiceItem(this, sourceType, sourceRef, description, unitPrice, quantity);
        items.add(item);
        recompute();
        return item;
    }

    /** Xoá một dòng theo id. Yêu cầu status OPEN. Trả về true nếu có xoá. */
    public boolean removeItem(Long itemId) {
        requireOpen();
        boolean removed = items.removeIf(it -> it.getId() != null && it.getId().equals(itemId));
        if (removed) {
            recompute();
        }
        return removed;
    }

    /** Đã có dòng VISIT_FEE cho visit này chưa? (idempotency cho consumer event). */
    public boolean hasVisitFee(Long visitId) {
        return items.stream().anyMatch(it ->
                it.getSourceType() == InvoiceItemSource.VISIT_FEE
                        && visitId.equals(it.getSourceRef()));
    }

    /** Đã có dòng MEDICATION cho đơn thuốc này chưa? */
    public boolean hasMedicationPrescription(Long prescriptionId) {
        return items.stream().anyMatch(it ->
                it.getSourceType() == InvoiceItemSource.MEDICATION
                        && prescriptionId.equals(it.getSourceRef()));
    }

    /** Chốt + thanh toán (OPEN → PAID). */
    public void checkout(PaymentMethod method, String paymentReference) {
        transitionTo(InvoiceStatus.PAID);
        this.paymentMethod = method;
        this.paymentReference = paymentReference;
        this.paidAt = Instant.now();
    }

    /** Backward-compatible checkout cho phương thức không cần payment reference. */
    public void checkout(PaymentMethod method) {
        checkout(method, null);
    }

    /** Huỷ hoá đơn (OPEN → CANCELLED). */
    public void cancel() {
        transitionTo(InvoiceStatus.CANCELLED);
    }

    private void recompute() {
        this.subtotal = items.stream()
                .map(InvoiceItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        this.total = this.subtotal;   // chưa có thuế/giảm giá ở v1
    }

    private void requireOpen() {
        if (status != InvoiceStatus.OPEN) {
            throw new IllegalStateException("Hoá đơn không ở trạng thái OPEN (hiện: " + status + ")");
        }
    }

    private void transitionTo(InvoiceStatus next) {
        if (!status.canTransitionTo(next)) {
            throw new IllegalStateException(
                    "Không thể chuyển hoá đơn từ " + status + " sang " + next);
        }
        this.status = next;
    }

    public void setNotes(String notes) { this.notes = notes; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public boolean isOpen() { return status == InvoiceStatus.OPEN; }

    public Long getId() { return id; }
    public UUID getCustomerUserId() { return customerUserId; }
    public String getCustomerName() { return customerName; }
    public String getCustomerEmail() { return customerEmail; }
    public InvoiceStatus getStatus() { return status; }
    public String getCurrency() { return currency; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getTotal() { return total; }
    public String getNotes() { return notes; }
    public Instant getIssuedAt() { return issuedAt; }
    public Instant getPaidAt() { return paidAt; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public String getPaymentReference() { return paymentReference; }
    public Long getVersion() { return version; }
    public List<InvoiceItem> getItems() { return items; }
}
