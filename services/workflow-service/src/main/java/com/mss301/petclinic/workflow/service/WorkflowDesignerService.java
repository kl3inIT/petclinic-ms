package com.mss301.petclinic.workflow.service;

import java.util.List;

import com.mss301.petclinic.workflow.dto.req.DeployWorkflowDefinitionRequest;
import com.mss301.petclinic.workflow.dto.res.ServiceTaskCatalogItemResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionDeploymentResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionSummaryResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionXmlResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDeploymentSummaryResponse;

public interface WorkflowDesignerService {

    List<ServiceTaskCatalogItemResponse> listServiceTasks();

    List<WorkflowDefinitionSummaryResponse> listDefinitions();

    List<WorkflowDeploymentSummaryResponse> listDeployments();

    WorkflowDefinitionXmlResponse getDefinitionXml(String processDefinitionKey);

    /**
     * Resolve BPMN XML for a running instance — prefers numeric Camunda key, then BPMN process id.
     */
    WorkflowDefinitionXmlResponse resolveInstanceDiagramXml(String bpmnProcessId, String numericProcessDefinitionKey);

    WorkflowDefinitionDeploymentResponse deployDefinition(DeployWorkflowDefinitionRequest request);
}
