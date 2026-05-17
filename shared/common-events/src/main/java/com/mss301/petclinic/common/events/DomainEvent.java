package com.mss301.petclinic.common.events;

import java.time.Instant;
import java.util.UUID;

/**
 * Contract chung cho mọi event nghiệp vụ publish qua AMQP.
 *
 * <p><b>Pattern Tolerant Reader:</b> publisher khai báo record implements interface này
 * trong package {@code events/} của service. Consumer KHÔNG cần implement — chỉ cần
 * declare local record với fields nó quan tâm (Jackson sẽ ignore extra fields).
 *
 * <p><b>Routing key convention:</b> {@code <domain>.<action>} — vd {@code visit.completed},
 * {@code invoice.created}, {@code payment.refunded}. Mặc định lấy từ {@link #eventType()}.
 */
public interface DomainEvent {

    /** UUID duy nhất mỗi event — dùng cho idempotency phía consumer. */
    UUID eventId();

    /** Loại event, dạng dotted — vd {@code visit.completed}. */
    String eventType();

    /** Thời điểm event xảy ra trong business domain (không phải lúc publish). */
    Instant occurredAt();

    /** Service phát event — vd {@code visits-service}. */
    String source();

    /** Routing key dùng cho topic exchange. Mặc định = {@link #eventType()}. */
    default String routingKey() {
        return eventType();
    }
}
