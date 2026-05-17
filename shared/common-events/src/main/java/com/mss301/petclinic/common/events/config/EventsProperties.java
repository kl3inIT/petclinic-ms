package com.mss301.petclinic.common.events.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình AMQP topology — tên exchange + DLX dùng chung cho toàn hệ thống.
 *
 * <p>Mặc định khớp với config-repo. Override qua {@code petclinic.events.*} trong
 * application.yml service nếu cần (vd test isolation).
 */
@ConfigurationProperties(prefix = "petclinic.events")
public class EventsProperties {

    /** Topic exchange chính — publisher gửi vào đây, consumer queue bind theo routing key. */
    private String exchange = "petclinic.events";

    /** Dead-letter exchange — consumer queue trỏ x-dead-letter-exchange vào đây khi reject. */
    private String dlx = "petclinic.events.dlx";

    /** Bật autoconfig topology + EventPublisher. Tắt khi test không cần broker thật. */
    private boolean enabled = true;

    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }

    public String getDlx() { return dlx; }
    public void setDlx(String dlx) { this.dlx = dlx; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
