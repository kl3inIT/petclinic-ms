package com.mss301.petclinic.common.events;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;

import com.mss301.petclinic.common.events.config.EventsProperties;

/**
 * Helper khai báo consumer queue + DLQ một dòng, tránh copy-paste boilerplate AMQP.
 *
 * <p>Pattern: per-service per-event-type queue → DLQ riêng cho từng cặp service/event,
 * dễ retry + debug. Naming convention {@code <service>.<routingKey>} (vd
 * {@code billing.visit.completed}).
 *
 * <p>Ví dụ trong consumer service:
 * <pre>{@code
 * @Bean
 * Declarables visitCompletedConsumer(EventsProperties p) {
 *     return EventQueues.consumer("billing.visit.completed", "visit.completed", p);
 * }
 *
 * @RabbitListener(queues = "billing.visit.completed")
 * public void on(VisitCompletedPayload event) { ... }
 * }</pre>
 *
 * <p>Exchange + DLX đã được autoconfig declare sẵn (idempotent),
 * helper chỉ thêm queue + 2 binding.
 */
public final class EventQueues {

    private EventQueues() {}

    /**
     * Tạo {@link Declarables} gồm main queue (durable, x-dead-letter-exchange → DLX),
     * DLQ (durable), và 2 binding (main exchange + DLX) cho cùng routing key.
     *
     * @param queueName    tên queue, convention {@code <service>.<routingKey>}
     * @param routingKey   topic routing key, vd {@code visit.completed}
     * @param props        bean {@link EventsProperties} (autowire trong @Bean method)
     */
    public static Declarables consumer(String queueName, String routingKey, EventsProperties props) {
        String dlqName = queueName + ".dlq";

        Queue main = QueueBuilder.durable(queueName)
                .withArgument("x-dead-letter-exchange", props.getDlx())
                .withArgument("x-dead-letter-routing-key", routingKey)
                .build();

        Queue dlq = QueueBuilder.durable(dlqName).build();

        TopicExchange mainEx = new TopicExchange(props.getExchange(), true, false);
        TopicExchange dlxEx = new TopicExchange(props.getDlx(), true, false);

        Binding mainBinding = BindingBuilder.bind(main).to(mainEx).with(routingKey);
        Binding dlqBinding = BindingBuilder.bind(dlq).to(dlxEx).with(routingKey);

        return new Declarables(main, dlq, mainEx, dlxEx, mainBinding, dlqBinding);
    }
}
