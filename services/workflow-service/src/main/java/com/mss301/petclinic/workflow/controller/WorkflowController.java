package com.mss301.petclinic.workflow.controller;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.workflow.dto.req.CompleteUserTaskRequest;
import com.mss301.petclinic.workflow.dto.req.StartWorkflowRequest;
import com.mss301.petclinic.workflow.dto.res.ProcessInstanceSummaryResponse;
import com.mss301.petclinic.workflow.dto.res.UserTaskResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionXmlResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowInstanceResponse;
import com.mss301.petclinic.workflow.service.WorkflowOrchestrationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/workflows")
@Tag(name = "Workflows", description = "Camunda BPM orchestration — start, inspect, and action process instances")
public class WorkflowController {

    private final WorkflowOrchestrationService workflowService;

    public WorkflowController(WorkflowOrchestrationService workflowService) {
        this.workflowService = workflowService;
    }

    // ── Process instances ─────────────────────────────────────────────────────

    @PostMapping("/instances")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "startWorkflow", description = "Start a Camunda process by definition key.")
    public WorkflowInstanceResponse startWorkflow(@Valid @RequestBody StartWorkflowRequest request) {
        return workflowService.startProcess(request);
    }

    @GetMapping("/instances")
    @Operation(summary = "listWorkflowInstances", description = "Search process instances with optional filter.")
    public List<ProcessInstanceSummaryResponse> listWorkflowInstances(
            @RequestParam(required = false) String processDefinitionId,
            @RequestParam(required = false) String state) {
        return workflowService.listProcessInstances(processDefinitionId, state);
    }

    @GetMapping("/instances/{processInstanceId}")
    @Operation(summary = "getWorkflowInstance", description = "Returns runtime state + flow nodes + variables for a process instance.")
    public WorkflowInstanceResponse getWorkflowInstance(@PathVariable String processInstanceId) {
        return workflowService.getProcessInstance(processInstanceId);
    }

    @GetMapping("/instances/{processInstanceId}/diagram-xml")
    @Operation(
            summary = "getWorkflowInstanceDiagramXml",
            description = "Returns deployed BPMN XML for the process definition backing this instance (Camunda 8 Orchestration REST)."
    )
    public WorkflowDefinitionXmlResponse getWorkflowInstanceDiagramXml(@PathVariable String processInstanceId) {
        return workflowService.getInstanceDiagramXml(processInstanceId);
    }

    @PostMapping("/instances/{processInstanceId}/terminate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "terminateWorkflowInstance", description = "Terminates an active Camunda 8 process instance.")
    public void terminateWorkflowInstance(@PathVariable String processInstanceId) {
        workflowService.terminateProcessInstance(processInstanceId);
    }

    @DeleteMapping("/instances/{processInstanceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "deleteWorkflowInstance", description = "Deletes historic data for a completed or terminated Camunda 8 process instance.")
    public void deleteWorkflowInstance(@PathVariable String processInstanceId) {
        workflowService.deleteProcessInstance(processInstanceId);
    }

    // ── User tasks ────────────────────────────────────────────────────────────

    @GetMapping("/tasks")
    @Operation(summary = "listUserTasks", description = "List Zeebe user tasks. Default state=CREATED (pending).")
    public List<UserTaskResponse> listUserTasks(
            @RequestParam(required = false) String processInstanceKey,
            @RequestParam(required = false) String state) {
        return workflowService.listUserTasks(processInstanceKey, state);
    }

    @GetMapping("/tasks/{userTaskKey}")
    @Operation(summary = "getUserTask", description = "Get a specific user task by key.")
    public ResponseEntity<UserTaskResponse> getUserTask(@PathVariable String userTaskKey) {
        UserTaskResponse task = workflowService.getUserTask(userTaskKey);
        return task != null ? ResponseEntity.ok(task) : ResponseEntity.notFound().build();
    }

    @PostMapping("/tasks/{userTaskKey}/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "completeUserTask", description = "Complete a user task with output variables.")
    public void completeUserTask(
            @PathVariable String userTaskKey,
            @RequestBody(required = false) CompleteUserTaskRequest request) {
        Map<String, Object> vars = request != null && request.variables() != null
                ? request.variables()
                : Map.of();
        workflowService.completeUserTask(userTaskKey, vars);
    }
}
