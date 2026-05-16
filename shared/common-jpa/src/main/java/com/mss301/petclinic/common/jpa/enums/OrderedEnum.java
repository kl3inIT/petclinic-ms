package com.mss301.petclinic.common.jpa.enums;

/**
 * Enum có ordering (sort, state transition). Dùng <b>gaps</b> để insert giá trị mới không cần re-number:
 *
 * <pre>{@code
 * enum BillStatus implements OrderedEnum {
 *     DRAFT(10),
 *     PENDING(20),
 *     PAID(30),
 *     // sau này thêm `OVERDUE(25)` ở giữa → KHÔNG đụng giá trị đã persist
 *     OVERDUE(25);
 * }
 * }</pre>
 *
 * <p>Forward-only invariant: nếu DB có row với {@code weight=30}, thêm enum mới với {@code weight=40+}
 * an toàn. Đừng giảm weight của value đã release.
 */
public interface OrderedEnum extends IdentifiedEnum {

    /**
     * Sort/transition weight. Convention: dùng bước nhảy 10 (10, 20, 30) khi định nghĩa lần đầu.
     */
    int weight();
}
