package com.mss301.petclinic.visits.client;

import java.util.Map;

public record WorkflowStartRequest(
        String processDefinitionKey,
        Map<String, Object> variables
) {}
