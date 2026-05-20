package com.mss301.petclinic.admin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

import de.codecentric.boot.admin.server.config.EnableAdminServer;

/**
 * Spring Boot Admin Server 4.0.0 (codecentric).
 *
 * <p>Tự discover các Spring service đã register vào Eureka — chỉ cần service expose
 * actuator endpoint (health/info/metrics/loggers/env/...). UI ở http://localhost:8185.
 *
 * <p>Mailer (Go) KHÔNG nằm trên Eureka — service đó self-register qua HTTP POST
 * {@code /instances} của SBA lúc startup (xem mailer-service/cmd/mailer/main.go).
 */
@SpringBootApplication
@EnableAdminServer
@EnableDiscoveryClient
public class AdminServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(AdminServerApplication.class, args);
    }
}
