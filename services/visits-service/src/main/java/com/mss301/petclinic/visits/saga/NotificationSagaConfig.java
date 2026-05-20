package com.mss301.petclinic.visits.saga;

import org.springframework.amqp.core.Declarables;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.mss301.petclinic.common.events.EventQueues;
import com.mss301.petclinic.common.events.config.EventsProperties;

/**
 * AMQP topology cho saga listener trong visits-service.
 *
 * <p>Mailer publish 2 event sau khi xử lý visit.completed — bound qua routing key
 * convention {@code <domain>.notification.<ack|failed>}:
 * <ul>
 *   <li>{@code visits.visit.notification.ack}     ← routing {@code visit.notification.ack}</li>
 *   <li>{@code visits.visit.notification.failed}  ← routing {@code visit.notification.failed}</li>
 * </ul>
 *
 * <p>Convention: queue name = {@code <service>.<routingKey>} — match helper bên Go mailer
 * (mailer.user.registered, mailer.visit.completed) + Java {@link EventQueues}.
 *
 * <p>Disabled khi {@code petclinic.events.enabled=false} (test slice) — không declare queue.
 */
@Configuration
@ConditionalOnProperty(prefix = "petclinic.events", name = "enabled", havingValue = "true", matchIfMissing = true)
public class NotificationSagaConfig {

    @Bean
    Declarables visitNotificationAckQueue(EventsProperties props) {
        return EventQueues.consumer(
                "visits.visit.notification.ack", "visit.notification.ack", props);
    }

    @Bean
    Declarables visitNotificationFailedQueue(EventsProperties props) {
        return EventQueues.consumer(
                "visits.visit.notification.failed", "visit.notification.failed", props);
    }
}
