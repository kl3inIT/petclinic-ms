package com.mss301.petclinic.workflow.service;

import com.mss301.petclinic.workflow.dto.req.StartWorkflowRequest;
import com.mss301.petclinic.workflow.dto.res.ProcessInstanceSummaryResponse;
import com.mss301.petclinic.workflow.dto.res.UserTaskResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionXmlResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowInstanceResponse;

import java.util.List;
import java.util.Map;

public interface WorkflowOrchestrationService {

    WorkflowInstanceResponse startProcess(StartWorkflowRequest request);

    WorkflowInstanceResponse getProcessInstance(String processInstanceId);

    WorkflowDefinitionXmlResponse getInstanceDiagramXml(String processInstanceId);

    List<ProcessInstanceSummaryResponse> listProcessInstances(String processDefinitionId, String state);

    List<UserTaskResponse> listUserTasks(String processInstanceKey, String state);

    UserTaskResponse getUserTask(String userTaskKey);

    void completeUserTask(String userTaskKey, Map<String, Object> variables);

    void terminateProcessInstance(String processInstanceId);
}
