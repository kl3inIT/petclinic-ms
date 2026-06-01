package com.mss301.petclinic.billing.consumer;

import org.springframework.amqp.core.Declarables;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.mss301.petclinic.common.events.EventQueues;
import com.mss301.petclinic.common.events.config.EventsProperties;

/**
 * AMQP topology cho billing consumer.
 *
 * <p>Queue {@code billing.visit.completed} ← routing key {@code visit.completed} (publish bởi
 * visits-service). Per-service per-event-type queue + DLQ riêng (xem {@link EventQueues}).
 *
 * <p>Disabled khi {@code petclinic.events.enabled=false} (test slice) — không declare queue.
 */
@Configuration
@ConditionalOnProperty(prefix = "petclinic.events", name = "enabled", havingValue = "true", matchIfMissing = true)
public class BillingEventsConfig {

    @Bean
    Declarables visitCompletedQueue(EventsProperties props) {
        return EventQueues.consumer("billing.visit.completed", "visit.completed", props);
    }
}
