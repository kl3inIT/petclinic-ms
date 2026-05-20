package com.mss301.petclinic.reviews.model;

import java.util.HashSet;
import java.util.Set;

import com.mss301.petclinic.common.jpa.enums.OrderedEnum;

/**
 * State machine cho Review lifecycle.
 *
 * <pre>
 *           ┌────── approve ──────┐
 *           ▼                     │
 * PUBLISHED ──hide──▶ HIDDEN ─unhide┘
 *     │ ▲
 *     │ └────── approve ──── PENDING_MODERATION  (sau khi moderator hit profanity lúc create)
 *     │                              │
 *     │                              └── hide ──▶ HIDDEN
 *     │
 *     ├── soft-delete (USER own) ─▶ DELETED  (terminal)
 *     └── hard-delete (ADMIN)     ─▶ DELETED
 * </pre>
 *
 * <p>FLAGGED dự phòng cho feature user-report v2 — không transition trong v1.
 *
 * <h4>Weight</h4>
 * Sort theo lifecycle bình thường: PUBLISHED &lt; PENDING_MODERATION &lt; FLAGGED &lt; HIDDEN &lt; DELETED.
 * Gap 10 cho phép insert giá trị mới mà không re-number (vd `UNDER_APPEAL=25`).
 *
 * <h4>Vì sao HashSet thay EnumSet</h4>
 * {@code EnumSet.noneOf(ReviewStatus.class)} trong enum constructor throw
 * {@code ClassCastException: not an enum} — class chưa được JVM mark là enum tại thời điểm đó.
 * HashSet + static init block (sau khi mọi constant load xong) tránh được vòng lặp này.
 */
public enum ReviewStatus implements OrderedEnum {

    PUBLISHED("PUBLISHED", 10),
    PENDING_MODERATION("PENDING_MODERATION", 20),
    FLAGGED("FLAGGED", 30),
    HIDDEN("HIDDEN", 40),
    DELETED("DELETED", 99);     // terminal

    private final String id;
    private final int weight;
    private final Set<ReviewStatus> allowed = new HashSet<>();

    ReviewStatus(String id, int weight) {
        this.id = id;
        this.weight = weight;
    }

    static {
        // Initial publish OR after admin approves moderation.
        PUBLISHED.allowed.add(HIDDEN);
        PUBLISHED.allowed.add(DELETED);

        // Moderation queue — admin decides.
        PENDING_MODERATION.allowed.add(PUBLISHED);
        PENDING_MODERATION.allowed.add(HIDDEN);
        PENDING_MODERATION.allowed.add(DELETED);

        // Reserved cho user-report flow v2.
        FLAGGED.allowed.add(PUBLISHED);
        FLAGGED.allowed.add(HIDDEN);
        FLAGGED.allowed.add(DELETED);

        // Admin có thể unhide hoặc xóa hẳn.
        HIDDEN.allowed.add(PUBLISHED);
        HIDDEN.allowed.add(DELETED);

        // DELETED: terminal, allowed rỗng.
    }

    @Override
    public String id() {
        return id;
    }

    @Override
    public int weight() {
        return weight;
    }

    public boolean canTransitionTo(ReviewStatus next) {
        return allowed.contains(next);
    }

    public boolean isTerminal() {
        return allowed.isEmpty();
    }
}
