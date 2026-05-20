package com.mss301.petclinic.common.events.autoconfigure;

import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.events.config.EventsProperties;

/**
 * Autoconfig cho event infra:
 * <ul>
 *   <li>Declare topic exchange chính + DLX (idempotent, các service publish/consume
 *       đều thấy cùng topology).</li>
 *   <li>{@link JacksonJsonMessageConverter} làm default — Boot 4 deprecate Jackson 2
 *       converter, nên dùng v3.</li>
 *   <li>{@link EventPublisher} bean cho service inject thay vì gọi RabbitTemplate trực tiếp.</li>
 * </ul>
 *
 * <p>Service muốn tắt (vd test slice không cần broker): {@code petclinic.events.enabled=false}.
 */
@AutoConfiguration
@ConditionalOnClass(RabbitTemplate.class)
@ConditionalOnProperty(prefix = "petclinic.events", name = "enabled", havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(EventsProperties.class)
public class PetClinicEventsAutoConfiguration {

    /**
     * Đăng ký bean MessageConverter default — Boot AMQP autoconfig sẽ tự gắn vào
     * RabbitTemplate (xem {@code RabbitAutoConfiguration#rabbitTemplate}).
     */
    @Bean
    @ConditionalOnMissingBean(MessageConverter.class)
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    /** Declare exchange chính + DLX (durable, non-auto-delete). */
    @Bean
    public Declarables eventsTopology(EventsProperties props) {
        return new Declarables(
                new TopicExchange(props.getExchange(), true, false),
                new TopicExchange(props.getDlx(), true, false));
    }

    @Bean
    @ConditionalOnMissingBean
    public EventPublisher eventPublisher(RabbitTemplate rabbitTemplate, EventsProperties props) {
        return new EventPublisher(rabbitTemplate, props);
    }
}
