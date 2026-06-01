package com.mss301.petclinic.workflow.dto.req;

import jakarta.validation.constraints.NotBlank;

public record DeployWorkflowDefinitionRequest(
        @NotBlank String name,
        @NotBlank String bpmnXml
) {}
