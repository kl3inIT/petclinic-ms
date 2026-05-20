package com.mss301.petclinic.workflow.dto.res;

import java.util.List;
import java.util.Map;

public record WorkflowInstanceResponse(
        String processInstanceKey,
        String processDefinitionKey,
        String bpmnProcessId,
        String state,
        String startDate,
        String endDate,
        Map<String, Object> variables,
        List<FlowNodeRecord> flowNodes
) {
    public record FlowNodeRecord(
            String elementId,
            String elementName,
            String type,
            String state,
            String startDate,
            String endDate
    ) {}
}
