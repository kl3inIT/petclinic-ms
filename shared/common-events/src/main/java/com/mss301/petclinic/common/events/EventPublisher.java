package com.mss301.petclinic.common.events;

import org.springframework.amqp.rabbit.core.RabbitTemplate;

import com.mss301.petclinic.common.events.config.EventsProperties;

/**
 * API publish event mức nghiệp vụ — service chỉ cần gọi {@code publish(event)},
 * không cần biết exchange name hay AMQP API.
 *
 * <p>Routing key tự lấy từ {@link DomainEvent#routingKey()}. Payload serialize qua
 * Jackson3JsonMessageConverter (auto-config trong common-events).
 *
 * <p>Idempotent từ phía publisher KHÔNG được đảm bảo — consumer phải tự dedupe
 * bằng {@link DomainEvent#eventId()} (UUID). Khuyến nghị: lưu eventId vào bảng
 * {@code processed_events} với unique constraint.
 */
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final EventsProperties props;

    public EventPublisher(RabbitTemplate rabbitTemplate, EventsProperties props) {
        this.rabbitTemplate = rabbitTemplate;
        this.props = props;
    }

    /** Publish event tới exchange chính với routing key từ {@link DomainEvent#routingKey()}. */
    public void publish(DomainEvent event) {
        rabbitTemplate.convertAndSend(props.getExchange(), event.routingKey(), event);
    }
}
