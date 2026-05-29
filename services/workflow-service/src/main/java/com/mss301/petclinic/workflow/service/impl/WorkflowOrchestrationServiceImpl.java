package com.mss301.petclinic.workflow.service.impl;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mss301.petclinic.workflow.dto.req.StartWorkflowRequest;
import com.mss301.petclinic.workflow.dto.res.ProcessInstanceSummaryResponse;
import com.mss301.petclinic.workflow.dto.res.UserTaskResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionXmlResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowInstanceResponse;
import com.mss301.petclinic.workflow.exception.ProcessInstanceNotFoundException;
import com.mss301.petclinic.workflow.service.WorkflowDesignerService;
import com.mss301.petclinic.workflow.service.WorkflowOrchestrationService;

import io.camunda.client.CamundaClient;
import io.camunda.client.api.response.ProcessInstanceEvent;

@Service
@Transactional(readOnly = true)
public class WorkflowOrchestrationServiceImpl implements WorkflowOrchestrationService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowOrchestrationServiceImpl.class);

    private final ObjectProvider<CamundaClient> camundaClient;
    private final WorkflowDesignerService workflowDesignerService;
    private final HttpClient operateHttp;
    private final String operateBaseUrl;
    private final String operateBasicAuth;
    private final ObjectMapper objectMapper;

    public WorkflowOrchestrationServiceImpl(
            ObjectProvider<CamundaClient> camundaClient,
            WorkflowDesignerService workflowDesignerService,
            @Qualifier("camundaOperateHttpClient") HttpClient operateHttp,
            @Qualifier("camundaOperateBaseUrl") String operateBaseUrl,
            @Qualifier("camundaOperateBasicAuth") String operateBasicAuth,
            ObjectMapper objectMapper) {
        this.camundaClient = camundaClient;
        this.workflowDesignerService = workflowDesignerService;
        this.operateHttp = operateHttp;
        this.operateBaseUrl = operateBaseUrl;
        this.operateBasicAuth = operateBasicAuth;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public WorkflowInstanceResponse startProcess(StartWorkflowRequest request) {
        ProcessInstanceEvent instance = requireClient().newCreateInstanceCommand()
                .bpmnProcessId(request.processDefinitionKey())
                .latestVersion()
                .variables(request.variables())
                .send()
                .join();

        return new WorkflowInstanceResponse(
                String.valueOf(instance.getProcessInstanceKey()),
                String.valueOf(instance.getProcessDefinitionKey()),
                instance.getBpmnProcessId(),
                "ACTIVE",
                null,
                null,
                request.variables(),
                List.of()
        );
    }

    @Override
    @SuppressWarnings("unchecked")
    public WorkflowInstanceResponse getProcessInstance(String processInstanceId) {
        try {
            // Camunda 8.6+ unified platform uses /v2/ (not the old standalone Operate /v1/)
            Map<String, Object> instance = getJson(
                    "/v2/process-instances/" + processInstanceId);

            if (instance == null) {
                return pending(processInstanceId);
            }

            String state = getString(instance, "state", "ACTIVE");
            String startDate = getString(instance, "startDate", null);
            String endDate = getString(instance, "endDate", null);
            // v2 renames bpmnProcessId → processDefinitionId
            String bpmnProcessId = getString(instance, "processDefinitionId", null);
            Object pdKey = instance.get("processDefinitionKey");
            String processDefinitionKey = pdKey != null ? String.valueOf(pdKey) : null;

            log.info("Operate v2 instance {} state={} bpmnProcessId={}", processInstanceId, state, bpmnProcessId);

            // v2 API uses string keys to avoid JS 64-bit precision loss
            Map<String, Object> flowNodeFilter = Map.of("processInstanceKey", processInstanceId);

            // Camunda 8.9 exposes flow node instance search under v1 while process/variable APIs are v2.
            List<WorkflowInstanceResponse.FlowNodeRecord> flowNodes = List.of();
            try {
                Map<String, Object> flowNodeResult = postJson(
                        "/v1/flownode-instances/search",
                        Map.of("filter", flowNodeFilter));
                flowNodes = extractFlowNodes(flowNodeResult);
            } catch (Exception e) {
                log.warn("Could not fetch flow nodes for instance {}: {}", processInstanceId, e.getMessage());
            }

            Map<String, Object> variables = Map.of();
            try {
                Map<String, Object> varResult = postJson(
                        "/v2/variables/search",
                        Map.of("filter", flowNodeFilter));
                variables = extractVariables(varResult);
            } catch (Exception e) {
                log.warn("Could not fetch variables for instance {}: {}", processInstanceId, e.getMessage());
            }

            return new WorkflowInstanceResponse(
                    processInstanceId, processDefinitionKey, bpmnProcessId,
                    state, startDate, endDate, variables, flowNodes);

        } catch (OperateNotFoundException e) {
            log.debug("Instance {} not yet indexed by Camunda", processInstanceId);
            return pending(processInstanceId);
        } catch (ProcessInstanceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Operate API error for instance {}: {}", processInstanceId, e.getMessage());
            return pending(processInstanceId);
        }
    }

    @Override
    public WorkflowDefinitionXmlResponse getInstanceDiagramXml(String processInstanceId) {
        WorkflowInstanceResponse instance = getProcessInstance(processInstanceId);
        return workflowDesignerService.resolveInstanceDiagramXml(
                instance.bpmnProcessId(),
                instance.processDefinitionKey()
        );
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> getJson(String path) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(operateBaseUrl + path))
                .header("Accept", "application/json")
                .header("Authorization", operateBasicAuth)
                .GET()
                .build();

        HttpResponse<String> res = operateHttp.send(req, HttpResponse.BodyHandlers.ofString());
        log.info("Operate GET {} → {}", path, res.statusCode());

        if (res.statusCode() == 404) throw new OperateNotFoundException(path);
        if (res.statusCode() != 200) {
            log.warn("Operate GET {} returned {}: {}", path, res.statusCode(), res.body());
            return null;
        }
        return objectMapper.readValue(res.body(), Map.class);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> postJson(String path, Object body) throws Exception {
        String bodyJson = objectMapper.writeValueAsString(body);
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(operateBaseUrl + path))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("Authorization", operateBasicAuth)
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();

        HttpResponse<String> res = operateHttp.send(req, HttpResponse.BodyHandlers.ofString());
        log.info("Operate POST {} → {}", path, res.statusCode());

        if (res.statusCode() == 204) return Map.of(); // No Content — success (e.g. task completion)
        if (res.statusCode() == 404) throw new OperateNotFoundException(path);
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            log.warn("Operate POST {} returned {}: {}", path, res.statusCode(), res.body());
            return null;
        }
        return objectMapper.readValue(res.body(), Map.class);
    }

    // ── New: list / user-task methods ─────────────────────────────────────────

    @Override
    @SuppressWarnings("unchecked")
    public List<ProcessInstanceSummaryResponse> listProcessInstances(String processDefinitionId, String state) {
        try {
            Map<String, Object> filterMap = new LinkedHashMap<>();
            if (processDefinitionId != null && !processDefinitionId.isBlank())
                filterMap.put("processDefinitionId", processDefinitionId);
            if (state != null && !state.isBlank())
                filterMap.put("state", state);

            Map<String, Object> body = Map.of(
                    "filter", filterMap,
                    "sort", List.of(Map.of("field", "startDate", "order", "DESC")));

            Map<String, Object> result = postJson("/v2/process-instances/search", body);
            return extractProcessInstances(result);
        } catch (Exception e) {
            log.warn("listProcessInstances error: {}", e.getMessage());
            return List.of();
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<UserTaskResponse> listUserTasks(String processInstanceKey, String state) {
        try {
            Map<String, Object> filterMap = new LinkedHashMap<>();
            filterMap.put("state", state != null ? state : "CREATED");
            if (processInstanceKey != null && !processInstanceKey.isBlank())
                filterMap.put("processInstanceKey", processInstanceKey);

            Map<String, Object> body = Map.of(
                    "filter", filterMap,
                    "sort", List.of(Map.of("field", "creationDate", "order", "DESC")));

            Map<String, Object> result = postJson("/v2/user-tasks/search", body);
            return extractUserTasks(result);
        } catch (Exception e) {
            log.warn("listUserTasks error: {}", e.getMessage());
            return List.of();
        }
    }

    @Override
    public UserTaskResponse getUserTask(String userTaskKey) {
        try {
            Map<String, Object> task = getJson("/v2/user-tasks/" + userTaskKey);
            return task != null ? mapToUserTask(task) : null;
        } catch (OperateNotFoundException e) {
            return null;
        } catch (Exception e) {
            log.warn("getUserTask error for {}: {}", userTaskKey, e.getMessage());
            return null;
        }
    }

    @Override
    public void completeUserTask(String userTaskKey, Map<String, Object> variables) {
        try {
            Map<String, Object> body = (variables != null && !variables.isEmpty())
                    ? Map.of("variables", variables)
                    : Map.of();
            Map<String, Object> result = postJson("/v2/user-tasks/" + userTaskKey + "/completion", body);
            if (result == null)
                throw new IllegalStateException("Camunda rejected task completion for " + userTaskKey);
            log.info("User task {} completed, variables={}", userTaskKey, variables);
        } catch (Exception e) {
            log.error("completeUserTask failed for {}: {}", userTaskKey, e.getMessage());
            throw new IllegalStateException("Failed to complete task: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void terminateProcessInstance(String processInstanceId) {
        try {
            long key = Long.parseLong(processInstanceId);
            requireClient().newCancelInstanceCommand(key).send().join();
            log.info("Process instance {} terminated", processInstanceId);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid Camunda process instance key: " + processInstanceId, e);
        } catch (Exception e) {
            log.error("terminateProcessInstance failed for {}: {}", processInstanceId, e.getMessage());
            throw new IllegalStateException("Failed to terminate process instance: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteProcessInstance(String processInstanceId) {
        try {
            postEmptyCommand("/process-instances/" + processInstanceId + "/deletion", "delete process instance " + processInstanceId);
            log.info("Process instance {} marked for deletion", processInstanceId);
        } catch (Exception e) {
            log.error("deleteProcessInstance failed for {}: {}", processInstanceId, e.getMessage());
            throw new IllegalStateException("Failed to delete process instance: " + e.getMessage(), e);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static WorkflowInstanceResponse pending(String id) {
        return new WorkflowInstanceResponse(id, null, null, "PENDING", null, null, Map.of(), List.of());
    }

    private CamundaClient requireClient() {
        CamundaClient client = camundaClient.getIfAvailable();
        if (client == null) throw new IllegalStateException("Camunda 8 client is not configured.");
        return client;
    }

    private static String getString(Map<String, Object> map, String key, String def) {
        Object v = map.get(key);
        return v != null ? String.valueOf(v) : def;
    }

    @SuppressWarnings("unchecked")
    private static List<WorkflowInstanceResponse.FlowNodeRecord> extractFlowNodes(Map<String, Object> result) {
        if (result == null) return List.of();
        Object items = result.get("items");
        if (!(items instanceof List<?> list)) return List.of();
        return list.stream()
                .filter(item -> item instanceof Map)
                .map(item -> {
                    Map<String, Object> m = (Map<String, Object>) item;
                    String elementType = m.containsKey("bpmnElementType")
                            ? getString(m, "bpmnElementType", "")
                            : getString(m, "type", "");
                    return new WorkflowInstanceResponse.FlowNodeRecord(
                            firstString(m, "elementId", "flowNodeId", ""),
                            firstString(m, "elementName", "flowNodeName", null),
                            elementType,
                            getString(m, "state", ""),
                            getString(m, "startDate", null),
                            getString(m, "endDate", null));
                })
                .toList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractVariables(Map<String, Object> result) {
        if (result == null) return Map.of();
        Object items = result.get("items");
        if (!(items instanceof List<?> list)) return Map.of();
        Map<String, Object> vars = new LinkedHashMap<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> m) {
                Object name = m.get("name");
                Object value = m.get("value");
                if (name != null) vars.put(String.valueOf(name), parseVar(value));
            }
        }
        return vars;
    }

    private Object parseVar(Object raw) {
        if (raw == null) return null;
        try {
            return objectMapper.readValue(String.valueOf(raw), Object.class);
        } catch (Exception e) {
            return String.valueOf(raw);
        }
    }

    @SuppressWarnings("unchecked")
    private static List<ProcessInstanceSummaryResponse> extractProcessInstances(Map<String, Object> result) {
        if (result == null) return List.of();
        Object items = result.get("items");
        if (!(items instanceof List<?> list)) return List.of();
        return list.stream()
                .filter(item -> item instanceof Map)
                .map(item -> {
                    Map<String, Object> m = (Map<String, Object>) item;
                    return new ProcessInstanceSummaryResponse(
                            getString(m, "processInstanceKey", null),
                            getString(m, "processDefinitionKey", null),
                            getString(m, "processDefinitionId", null),
                            getInt(m, "processDefinitionVersion", 0),
                            getString(m, "state", "UNKNOWN"),
                            getBoolean(m, "hasIncident", false),
                            getString(m, "startDate", null),
                            getString(m, "endDate", null));
                })
                .toList();
    }

    @SuppressWarnings("unchecked")
    private static List<UserTaskResponse> extractUserTasks(Map<String, Object> result) {
        if (result == null) return List.of();
        Object items = result.get("items");
        if (!(items instanceof List<?> list)) return List.of();
        return list.stream()
                .filter(item -> item instanceof Map)
                .map(item -> {
                    Map<String, Object> m = (Map<String, Object>) item;
                    return mapToUserTask(m);
                })
                .toList();
    }

    private static UserTaskResponse mapToUserTask(Map<String, Object> m) {
        return new UserTaskResponse(
                getString(m, "userTaskKey", null),
                getString(m, "elementId", null),
                getString(m, "elementInstanceKey", null),
                getString(m, "processDefinitionKey", null),
                getString(m, "processDefinitionId", null),
                getString(m, "processInstanceKey", null),
                getString(m, "name", null),
                getString(m, "assignee", null),
                getString(m, "state", "CREATED"),
                getString(m, "creationDate", null),
                getString(m, "completionDate", null),
                getString(m, "dueDate", null),
                getString(m, "formKey", null));
    }

    private static int getInt(Map<String, Object> map, String key, int def) {
        Object v = map.get(key);
        if (v instanceof Number n) return n.intValue();
        if (v != null) try { return Integer.parseInt(String.valueOf(v)); } catch (NumberFormatException ignored) { }
        return def;
    }

    private static boolean getBoolean(Map<String, Object> map, String key, boolean def) {
        Object v = map.get(key);
        if (v instanceof Boolean b) return b;
        if (v != null) return Boolean.parseBoolean(String.valueOf(v));
        return def;
    }

    private static String firstString(Map<String, Object> map, String firstKey, String secondKey, String def) {
        Object first = map.get(firstKey);
        if (first != null) return String.valueOf(first);
        Object second = map.get(secondKey);
        return second != null ? String.valueOf(second) : def;
    }

    private void postEmptyCommand(String path, String operation) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(operateBaseUrl + path))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("Authorization", operateBasicAuth)
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .build();

        HttpResponse<String> res = operateHttp.send(req, HttpResponse.BodyHandlers.ofString());
        log.info("Operate command {} POST {} -> {}", operation, path, res.statusCode());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw new IllegalStateException("Camunda rejected " + operation + " (" + res.statusCode() + "): " + res.body());
        }
    }

    private static class OperateNotFoundException extends RuntimeException {
        OperateNotFoundException(String path) { super("Not found: " + path); }
    }
}
