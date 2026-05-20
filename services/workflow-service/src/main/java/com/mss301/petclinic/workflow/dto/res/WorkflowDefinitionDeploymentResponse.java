package com.mss301.petclinic.workflow.dto.res;

public record WorkflowDefinitionDeploymentResponse(
        String deploymentId,
        String name,
        int deployedDefinitions
) {}
