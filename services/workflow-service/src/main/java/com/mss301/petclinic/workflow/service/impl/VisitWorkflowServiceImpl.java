package com.mss301.petclinic.workflow.service.impl;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.workflow.client.VisitSummary;
import com.mss301.petclinic.workflow.config.WorkflowProperties;
import com.mss301.petclinic.workflow.dto.res.UserTaskResponse;
import com.mss301.petclinic.workflow.service.VisitWorkflowService;
import com.mss301.petclinic.workflow.service.WorkflowOrchestrationService;

@Service
public class VisitWorkflowServiceImpl implements VisitWorkflowService {

    private final WorkflowOrchestrationService orchestration;
    private final RestClient visitsClient;

    public VisitWorkflowServiceImpl(
            WorkflowOrchestrationService orchestration,
            @LoadBalanced RestClient.Builder lbBuilder,
            WorkflowProperties props) {
        this.orchestration = orchestration;
        this.visitsClient = lbBuilder.clone()
                .baseUrl(props.visitsServiceBaseUrl())
                .build();
    }

    @Override
    public void approveVisit(Long visitId) {
        String taskKey = findTaskKey(visitId, "UserTask_Approve");
        orchestration.completeUserTask(taskKey, Map.of("approved", true));
    }

    @Override
    public void rejectVisit(Long visitId) {
        String taskKey = findTaskKey(visitId, "UserTask_Approve");
        orchestration.completeUserTask(taskKey, Map.of("approved", false));
    }

    @Override
    public void startExam(Long visitId) {
        String taskKey = findTaskKey(visitId, "UserTask_StartVisit");
        orchestration.completeUserTask(taskKey, Map.of());
    }

    @Override
    public void completeExam(Long visitId, String diagnosis, String treatment, BigDecimal fee) {
        String taskKey = findTaskKey(visitId, "UserTask_CompleteVisit");
        Map<String, Object> vars = new LinkedHashMap<>();
        if (diagnosis != null) vars.put("diagnosis", diagnosis);
        if (treatment != null) vars.put("treatment", treatment);
        if (fee != null) vars.put("fee", fee);
        orchestration.completeUserTask(taskKey, vars);
    }

    private Long getProcessInstanceKey(Long visitId) {
        try {
            VisitSummary visit = visitsClient.get()
                    .uri("/api/v1/visits/{id}", visitId)
                    .retrieve()
                    .body(VisitSummary.class);
            if (visit == null || visit.processInstanceKey() == null) {
                throw new BadRequestAlertException(
                        "Visit " + visitId + " chưa có workflow (processInstanceKey null)",
                        "Visit", "no-process-instance");
            }
            return visit.processInstanceKey();
        } catch (BadRequestAlertException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Không thể lấy thông tin visit " + visitId + ": " + e.getMessage(), e);
        }
    }

    private String findTaskKey(Long visitId, String elementId) {
        Long processInstanceKey = getProcessInstanceKey(visitId);
        List<UserTaskResponse> tasks = orchestration.listUserTasks(
                String.valueOf(processInstanceKey), "CREATED");
        return tasks.stream()
                .filter(t -> elementId.equals(t.elementId()))
                .map(UserTaskResponse::userTaskKey)
                .findFirst()
                .orElseThrow(() -> new BadRequestAlertException(
                        "Không có task '" + elementId + "' đang chờ cho visit " + visitId,
                        "Visit", "task-not-found"));
    }
}
