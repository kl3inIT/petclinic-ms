package com.mss301.petclinic.common.events.saga;

import java.time.Instant;
import java.util.UUID;

/**
 * Generic envelope mailer (hoặc bất kỳ notifier nào) publish khi gửi notification THÀNH CÔNG.
 *
 * <h4>Routing key convention</h4>
 * <pre>{@code <domain>.notification.ack}</pre>
 * Vd: {@code visit.notification.ack}, {@code user.notification.ack}.
 *
 * <p>Mỗi service initiator bind queue với routing pattern của domain mình → chỉ nhận
 * ack thuộc saga của mình, không cross-service noise.
 *
 * <h4>Correlation</h4>
 * {@code originalEventId} = UUID của event gốc đã kích hoạt saga (vd
 * {@code VisitCompletedEvent.eventId}). Service initiator map về saga row qua field này.
 *
 * <h4>Tolerant Reader</h4>
 * Consumer Go/Java declare local record với fields họ cần — Jackson ignore extra field
 * mà publisher version mới thêm vào (backward-compatible evolution).
 */
public record NotificationAck(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,
        UUID originalEventId,
        String domain,          // "visit" | "user" | "invoice" ...
        String entityId,        // domain entity ID (string để generic — Long visit_id serialize sang string)
        String recipient        // email/phone (thông tin gửi tới)
) {
    public String routingKey() {
        return domain + ".notification.ack";
    }
}
