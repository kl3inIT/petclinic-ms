package com.mss301.petclinic.products.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

@Entity
@Table(name = "stock_movements")
public class StockMovement extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false, updatable = false)
    private InventoryOperation operation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, updatable = false)
    private Product product;

    @Column(name = "quantity_delta", nullable = false, updatable = false)
    private int quantityDelta;

    @Column(name = "quantity_before", nullable = false, updatable = false)
    private int quantityBefore;

    @Column(name = "quantity_after", nullable = false, updatable = false)
    private int quantityAfter;

    protected StockMovement() {
        // JPA
    }

    public StockMovement(InventoryOperation operation, Product product, int quantityDelta,
                         int quantityBefore, int quantityAfter) {
        this.operation = operation;
        this.product = product;
        this.quantityDelta = quantityDelta;
        this.quantityBefore = quantityBefore;
        this.quantityAfter = quantityAfter;
    }

    public Long getId() { return id; }
    public InventoryOperation getOperation() { return operation; }
    public Product getProduct() { return product; }
    public int getQuantityDelta() { return quantityDelta; }
    public int getQuantityBefore() { return quantityBefore; }
    public int getQuantityAfter() { return quantityAfter; }
}
