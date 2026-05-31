package com.mss301.petclinic.workflow.delegate;

import java.math.BigDecimal;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.mss301.petclinic.workflow.config.WorkflowProperties;

import io.camunda.client.annotation.JobWorker;
import io.camunda.client.api.response.ActivatedJob;

/**
 * Job Worker: {@code petclinic:visit:transition}.
 *
 * <p>Nhận task từ Camunda và gọi callback về visits-service để chuyển trạng thái Visit.
 * Các biến process cần có:
 * <ul>
 *   <li>{@code visitId} (Long) — ID của Visit cần chuyển trạng thái</li>
 *   <li>{@code targetStatus} (String) — IN_PROGRESS | COMPLETED | CANCELLED</li>
 *   <li>{@code diagnosis}, {@code treatment}, {@code fee} — chỉ cần khi targetStatus=COMPLETED</li>
 * </ul>
 */
@Component
public class VisitTransitionDelegate {

    private static final Logger log = LoggerFactory.getLogger(VisitTransitionDelegate.class);

    private final RestClient visitsClient;
    private final WorkflowProperties props;

    public VisitTransitionDelegate(@LoadBalanced RestClient.Builder lbBuilder,
                                   WorkflowProperties props) {
        this.visitsClient = lbBuilder.clone()
                .baseUrl(props.visitsServiceBaseUrl())
                .build();
        this.props = props;
    }

    @JobWorker(type = "petclinic:visit:transition")
    public void transitionVisit(ActivatedJob job) {
        Map<String, Object> vars = job.getVariablesAsMap();
        Long visitId = toLong(vars.get("visitId"));
        String targetStatus = (String) vars.get("targetStatus");

        TransitionPayload payload = new TransitionPayload(
                targetStatus,
                (String) vars.get("diagnosis"),
                (String) vars.get("treatment"),
                vars.get("fee") != null ? new BigDecimal(vars.get("fee").toString()) : null
        );

        visitsClient.patch()
                .uri("/internal/visits/{id}/transition", visitId)
                .header("X-Workflow-Token", props.callbackToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity();

        log.info("Transitioned visit {} → {} (processInstance={})",
                visitId, targetStatus, job.getProcessInstanceKey());
    }

    private static Long toLong(Object value) {
        if (value == null) throw new IllegalArgumentException("visitId is required");
        if (value instanceof Number n) return n.longValue();
        return Long.parseLong(value.toString());
    }

    private record TransitionPayload(
            String targetStatus,
            String diagnosis,
            String treatment,
            BigDecimal fee
    ) {}
}
