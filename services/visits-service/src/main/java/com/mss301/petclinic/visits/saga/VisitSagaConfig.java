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
 * <p>Billing và mailer publish ACK/FAILED sau khi xử lý event của visits — bound qua
 * routing key convention {@code <domain>.<step>.<ack|failed>}:
 * <ul>
 *   <li>{@code visits.visit.billing.ack}          ← routing {@code visit.billing.ack}</li>
 *   <li>{@code visits.visit.billing.failed}       ← routing {@code visit.billing.failed}</li>
 *   <li>{@code visits.visit.notification.ack}     ← routing {@code visit.notification.ack}</li>
 *   <li>{@code visits.visit.notification.failed}  ← routing {@code visit.notification.failed}</li>
 *   <li>{@code visits.prescription.billing.ack}   ← routing {@code prescription.billing.ack}</li>
 *   <li>{@code visits.prescription.billing.failed}← routing {@code prescription.billing.failed}</li>
 * </ul>
 *
 * <p>Convention: queue name = {@code <service>.<routingKey>} — match helper bên Go mailer
 * (mailer.user.registered, mailer.visit.completed) + Java {@link EventQueues}.
 *
 * <p>Disabled khi {@code petclinic.events.enabled=false} (test slice) — không declare queue.
 */
@Configuration
@ConditionalOnProperty(prefix = "petclinic.events", name = "enabled", havingValue = "true", matchIfMissing = true)
public class VisitSagaConfig {

    @Bean
    Declarables visitBillingAckQueue(EventsProperties props) {
        return EventQueues.consumer(
                "visits.visit.billing.ack", "visit.billing.ack", props);
    }

    @Bean
    Declarables visitBillingFailedQueue(EventsProperties props) {
        return EventQueues.consumer(
                "visits.visit.billing.failed", "visit.billing.failed", props);
    }

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

    @Bean
    Declarables prescriptionBillingAckQueue(EventsProperties props) {
        return EventQueues.consumer(
                "visits.prescription.billing.ack", "prescription.billing.ack", props);
    }

    @Bean
    Declarables prescriptionBillingFailedQueue(EventsProperties props) {
        return EventQueues.consumer(
                "visits.prescription.billing.failed", "prescription.billing.failed", props);
    }
}
