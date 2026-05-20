package com.mss301.petclinic.workflow.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.workflow.dto.req.DeployWorkflowDefinitionRequest;
import com.mss301.petclinic.workflow.dto.res.ServiceTaskCatalogItemResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionDeploymentResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionSummaryResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionXmlResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDeploymentSummaryResponse;
import com.mss301.petclinic.workflow.service.WorkflowDesignerService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/workflows/designer")
@Tag(name = "Workflow Designer", description = "BPMN modeling support endpoints")
public class WorkflowDesignerController {

    private final WorkflowDesignerService workflowDesignerService;

    public WorkflowDesignerController(WorkflowDesignerService workflowDesignerService) {
        this.workflowDesignerService = workflowDesignerService;
    }

    @GetMapping("/service-tasks")
    @Operation(summary = "List workflow service tasks", description = "Returns BPMN service task templates available in this service.")
    public List<ServiceTaskCatalogItemResponse> listServiceTasks() {
        return workflowDesignerService.listServiceTasks();
    }

    @GetMapping("/definitions")
    @Operation(summary = "List workflow definitions", description = "Returns deployed BPMN process definitions from Camunda.")
    public List<WorkflowDefinitionSummaryResponse> listDefinitions() {
        return workflowDesignerService.listDefinitions();
    }

    @GetMapping("/deployments")
    @Operation(summary = "List workflow deployments", description = "Returns recent Camunda deployments.")
    public List<WorkflowDeploymentSummaryResponse> listDeployments() {
        return workflowDesignerService.listDeployments();
    }

    @GetMapping("/definitions/{processDefinitionKey}/xml")
    @Operation(summary = "Get BPMN XML", description = "Returns latest deployed BPMN XML, or a starter diagram if the key does not exist.")
    public WorkflowDefinitionXmlResponse getDefinitionXml(@PathVariable String processDefinitionKey) {
        return workflowDesignerService.getDefinitionXml(processDefinitionKey);
    }

    @PostMapping("/definitions/deploy")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Deploy BPMN XML", description = "Deploys a BPMN diagram into the Camunda repository at runtime.")
    public WorkflowDefinitionDeploymentResponse deployDefinition(@Valid @RequestBody DeployWorkflowDefinitionRequest request) {
        return workflowDesignerService.deployDefinition(request);
    }
}
