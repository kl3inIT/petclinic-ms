package com.mss301.petclinic.common.events.saga;

/**
 * Trạng thái terminal/non-terminal cho saga choreography.
 *
 * <p>Generic — dùng cho mọi service tự implement saga (visits, auth, billing tương lai...).
 * Service-specific state (vd. visit_id, user_id, invoice_id) thuộc về entity riêng của service,
 * KHÔNG share qua common-events.
 *
 * <pre>
 * PENDING ──ack───────▶ COMPLETED    (happy path)
 *    │
 *    └──ack-failed────▶ COMPENSATED  (compensating transaction triggered)
 * </pre>
 *
 * <p>{@code COMPLETED} và {@code COMPENSATED} terminal. KHÔNG có CANCELLED — saga không
 * bị cancel giữa chừng, chỉ kết thúc qua 1 trong 2 đường trên.
 */
public enum SagaStatus {
    PENDING,
    COMPLETED,
    COMPENSATED
}
