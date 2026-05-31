package com.mss301.petclinic.visits.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Token dùng để xác thực callback từ workflow-service.
 * Phải khớp với {@code petclinic.workflow.callback-token} bên workflow-service.
 */
@ConfigurationProperties(prefix = "petclinic.workflow")
public record WorkflowCallbackProperties(
        @DefaultValue("petclinic-workflow-secret") String callbackToken,
        @DefaultValue("visit-booking") String visitBookingProcessId
) {}
