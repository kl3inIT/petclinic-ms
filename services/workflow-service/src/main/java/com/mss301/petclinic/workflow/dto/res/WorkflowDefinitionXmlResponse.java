package com.mss301.petclinic.workflow.dto.res;

public record WorkflowDefinitionXmlResponse(
        String processDefinitionKey,
        String bpmnXml,
        boolean deployed
) {}
