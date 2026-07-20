package com.mss301.petclinic.products.model;

import java.math.BigDecimal;
import java.util.Locale;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Mục trong catalog — thuốc ({@code MEDICATION}), dịch vụ khám ({@code SERVICE}) hoặc
 * vật tư ({@code SUPPLY}). Vet chọn mục khi kê đơn / hoàn tất khám → đơn giá + (với mục
 * có tồn kho) trừ kho.
 *
 * <p>Business key = {@link #code} (UNIQUE). {@link #active}=false để ẩn khỏi catalog mà
 * không xoá cứng (giữ tham chiếu lịch sử trên hoá đơn/đơn thuốc cũ).
 *
 * <h4>Tồn kho</h4>
 * Chỉ {@code MEDICATION}/{@code SUPPLY} ({@link ProductType#isStockTracked()}) mới giữ
 * {@link #stockQuantity}. {@code SERVICE} để {@code null}. {@link #consume}/{@link #restock}
 * giữ bất biến không-âm.
 */
@Entity
@Table(name = "products",
        uniqueConstraints = @UniqueConstraint(name = "uk_products_code", columnNames = "code"))
public class Product extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 80)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductType type;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    /** Đơn vị tính — "viên", "hộp", "lần", "tuýp"… (hiển thị). */
    @Column(length = 30)
    private String unit;

    /** Tồn kho hiện tại — null cho mục không quản lý tồn ({@code SERVICE}). */
    @Column(name = "stock_quantity")
    private Integer stockQuantity;

    /** Ngưỡng cảnh báo nhập thêm — stock ≤ reorderLevel ⇒ {@link StockStatus#LOW}. */
    @Column(name = "reorder_level", nullable = false)
    private Integer reorderLevel = 0;

    @Column(nullable = false)
    private boolean active = true;

    @Version
    private Long version;

    protected Product() {
        // JPA
    }

    public Product(String code, String name, String category, String description, ProductType type,
                   BigDecimal unitPrice, String unit, Integer stockQuantity, Integer reorderLevel) {
        this.code = code.trim().toUpperCase(Locale.ROOT);
        this.name = name.trim();
        this.category = normalizeNullable(category);
        this.description = normalizeNullable(description);
        this.type = type;
        this.unitPrice = unitPrice;
        this.unit = normalizeNullable(unit);
        this.reorderLevel = reorderLevel != null ? reorderLevel : 0;
        // SERVICE không quản lý tồn kho → ép null bất kể input.
        this.stockQuantity = type.isStockTracked() ? (stockQuantity != null ? stockQuantity : 0) : null;
        this.active = true;
    }

    /** Partial update — chỉ áp field non-null (PATCH semantics ở service). */
    public void update(String name, String category, String description, BigDecimal unitPrice,
                       String unit, Integer reorderLevel, Boolean active) {
        if (name != null) this.name = name.trim();
        if (category != null) this.category = normalizeNullable(category);
        if (description != null) this.description = normalizeNullable(description);
        if (unitPrice != null) this.unitPrice = unitPrice;
        if (unit != null) this.unit = normalizeNullable(unit);
        if (reorderLevel != null) this.reorderLevel = reorderLevel;
        if (active != null) this.active = active;
    }

    public boolean isStockTracked() {
        return type.isStockTracked();
    }

    /** Trừ kho khi kê đơn/cấp phát. Caller (service) đã validate đủ tồn + qty>0. */
    public void consume(int qty) {
        if (!active) {
            throw new IllegalStateException("Sản phẩm " + code + " đã ngừng kinh doanh");
        }
        if (!isStockTracked()) {
            throw new IllegalStateException("Sản phẩm " + code + " không quản lý tồn kho");
        }
        if (qty <= 0) {
            throw new IllegalArgumentException("Số lượng phải > 0");
        }
        if (stockQuantity == null || stockQuantity < qty) {
            throw new IllegalStateException("Không đủ tồn kho cho " + code);
        }
        this.stockQuantity -= qty;
    }

    /** Nhập thêm kho. */
    public void restock(int qty) {
        if (!active) {
            throw new IllegalStateException("Sản phẩm " + code + " đã ngừng kinh doanh");
        }
        if (!isStockTracked()) {
            throw new IllegalStateException("Sản phẩm " + code + " không quản lý tồn kho");
        }
        if (qty <= 0) {
            throw new IllegalArgumentException("Số lượng phải > 0");
        }
        this.stockQuantity = Math.addExact(stockQuantity == null ? 0 : stockQuantity, qty);
    }

    /** Public delete semantics are logical so historical invoice/prescription references stay valid. */
    public void deactivate() {
        this.active = false;
    }

    /** Trạng thái tồn kho tính động. {@code null} cho mục không quản lý tồn. */
    public StockStatus stockStatus() {
        if (!isStockTracked()) {
            return null;
        }
        if (stockQuantity == null || stockQuantity <= 0) {
            return StockStatus.OUT;
        }
        if (stockQuantity <= reorderLevel) {
            return StockStatus.LOW;
        }
        return StockStatus.AVAILABLE;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public String getDescription() { return description; }
    public ProductType getType() { return type; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public String getUnit() { return unit; }
    public Integer getStockQuantity() { return stockQuantity; }
    public Integer getReorderLevel() { return reorderLevel; }
    public boolean isActive() { return active; }
    public Long getVersion() { return version; }

    private static String normalizeNullable(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
