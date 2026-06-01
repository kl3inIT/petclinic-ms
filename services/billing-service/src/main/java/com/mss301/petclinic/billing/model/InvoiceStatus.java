package com.mss301.petclinic.billing.model;

import java.util.HashSet;
import java.util.Set;

import com.mss301.petclinic.common.jpa.enums.OrderedEnum;

/**
 * State machine cho hoá đơn gộp.
 *
 * <pre>
 * OPEN ──checkout──▶ PAID       (terminal)
 *   └────cancel─────▶ CANCELLED (terminal)
 * </pre>
 *
 * <p>OPEN = tab đang mở, còn append/xoá dòng được. PAID/CANCELLED = chốt, bất biến.
 * Gap weight 10 cho phép chèn trạng thái mới (vd {@code PARTIALLY_PAID=15}) về sau.
 */
public enum InvoiceStatus implements OrderedEnum {

    OPEN("OPEN", 10),
    PAID("PAID", 20),
    CANCELLED("CANCELLED", 99);     // terminal

    private final String id;
    private final int weight;
    private final Set<InvoiceStatus> allowed = new HashSet<>();

    InvoiceStatus(String id, int weight) {
        this.id = id;
        this.weight = weight;
    }

    static {
        OPEN.allowed.add(PAID);
        OPEN.allowed.add(CANCELLED);
        // PAID / CANCELLED: terminal, allowed rỗng.
    }

    @Override
    public String id() {
        return id;
    }

    @Override
    public int weight() {
        return weight;
    }

    public boolean canTransitionTo(InvoiceStatus next) {
        return allowed.contains(next);
    }

    public boolean isTerminal() {
        return allowed.isEmpty();
    }
}
