package com.mss301.petclinic.workflow.dto.res;

public record UserTaskResponse(
        String userTaskKey,
        String elementId,
        String elementInstanceKey,
        String processDefinitionKey,
        String processDefinitionId,
        String processInstanceKey,
        String name,
        String assignee,
        String state,
        String creationDate,
        String completionDate,
        String dueDate,
        String formKey
) {}
