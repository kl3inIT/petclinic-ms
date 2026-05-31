package com.mss301.petclinic.workflow.dto.req;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;

/**
 * Khởi chạy process instance theo definition key (deployed BPMN).
 */
public record StartWorkflowRequest(
        @NotBlank String processDefinitionKey,
        Map<String, Object> variables
) {
    public StartWorkflowRequest {
        if (variables == null) {
            variables = Map.of();
        }
    }
}
