package com.mss301.petclinic.workflow.dto.res;

public record ProcessInstanceSummaryResponse(
        String processInstanceKey,
        String processDefinitionKey,
        String processDefinitionId,
        int processDefinitionVersion,
        String state,
        boolean hasIncident,
        String startDate,
        String endDate
) {}
