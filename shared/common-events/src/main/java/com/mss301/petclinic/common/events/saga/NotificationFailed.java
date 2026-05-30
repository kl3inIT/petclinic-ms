package com.mss301.petclinic.common.events.saga;

import java.time.Instant;
import java.util.UUID;

/**
 * Generic envelope mailer publish khi notification FAIL vĩnh viễn (sau retry exhausted,
 * SMTP error không recoverable, recipient bounce).
 *
 * <h4>Routing key convention</h4>
 * <pre>{@code <domain>.notification.failed}</pre>
 *
 * <p>Triggers compensating transaction tại service initiator. Compensation cụ thể là gì
 * (refund, alert admin, mark for manual followup) thuộc về business logic của service —
 * common-events chỉ cung cấp envelope generic.
 *
 * <p>{@code errorMessage} — last error từ notifier để initiator log/audit. KHÔNG phải
 * machine-readable code; nếu cần phân loại lỗi (rate-limit vs invalid address) → thêm field
 * {@code errorCode} sau khi pattern dùng nhiều.
 */
public record NotificationFailed(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,
        UUID originalEventId,
        String domain,
        String entityId,
        String recipient,
        String errorMessage
) {
    public String routingKey() {
        return domain + ".notification.failed";
    }
}
