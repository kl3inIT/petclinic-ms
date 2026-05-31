package com.mss301.petclinic.workflow.dto.res;

public record WorkflowDefinitionSummaryResponse(
        String id,
        String key,
        String name,
        int version,
        String deploymentId,
        String resourceName,
        boolean suspended
) {}
