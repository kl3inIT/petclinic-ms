package com.mss301.petclinic.visits.model;

import com.mss301.petclinic.common.jpa.enums.OrderedEnum;

import java.util.HashSet;
import java.util.Set;

/**
 * State machine cho Visit. Implement {@link OrderedEnum} (extends {@code IdentifiedEnum}) để:
 * <ul>
 *   <li>{@code id()} — stable string lưu DB (tách rời {@link Enum#name()}, rename refactor an toàn)</li>
 *   <li>{@code weight()} — sort theo lifecycle progression (SCHEDULED &lt; IN_PROGRESS &lt; COMPLETED)</li>
 *   <li>{@code labelKey()} — i18n key {@code VisitStatus.SCHEDULED} (default từ IdentifiedEnum)</li>
 * </ul>
 *
 * <pre>
 * SCHEDULED ──start──▶ IN_PROGRESS ──complete──▶ COMPLETED (terminal)
 *     │                     │
 *     ├──cancel──▶ CANCELLED (terminal, weight=99 — ngoài flow chính)
 *     └──cancel──▶ CANCELLED
 * </pre>
 *
 * <h4>Vì sao HashSet thay EnumSet</h4>
 * {@code EnumSet.noneOf(VisitStatus.class)} trong enum constructor throw
 * {@code ClassCastException: not an enum} — class chưa được JVM mark là enum tại thời điểm đó.
 * HashSet + static init block (sau khi mọi constant load xong) tránh được vòng lặp này.
 */
public enum VisitStatus implements OrderedEnum {

    SCHEDULED("SCHEDULED", 10),
    IN_PROGRESS("IN_PROGRESS", 20),
    COMPLETED("COMPLETED", 30),     // terminal
    CANCELLED("CANCELLED", 99);     // terminal, off-flow

    private final String id;
    private final int weight;
    private final Set<VisitStatus> allowed = new HashSet<>();

    VisitStatus(String id, int weight) {
        this.id = id;
        this.weight = weight;
    }

    static {
        SCHEDULED.allowed.add(IN_PROGRESS);
        SCHEDULED.allowed.add(CANCELLED);
        IN_PROGRESS.allowed.add(COMPLETED);
        IN_PROGRESS.allowed.add(CANCELLED);
        // COMPLETED + CANCELLED: terminal, allowed rỗng
    }

    @Override
    public String id() {
        return id;
    }

    @Override
    public int weight() {
        return weight;
    }

    public boolean canTransitionTo(VisitStatus next) {
        return allowed.contains(next);
    }

    public boolean isTerminal() {
        return allowed.isEmpty();
    }
}
