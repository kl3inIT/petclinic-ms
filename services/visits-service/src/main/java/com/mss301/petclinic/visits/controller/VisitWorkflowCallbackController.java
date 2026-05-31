package com.mss301.petclinic.visits.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.visits.config.WorkflowCallbackProperties;
import com.mss301.petclinic.visits.dto.req.CompleteVisitRequest;
import com.mss301.petclinic.visits.dto.req.VisitTransitionRequest;
import com.mss301.petclinic.visits.dto.res.VisitResponse;
import com.mss301.petclinic.visits.model.VisitStatus;
import com.mss301.petclinic.visits.service.VisitService;

/**
 * Internal callback endpoint — chỉ dành cho workflow-service gọi để điều phối trạng thái Visit.
 * Xác thực qua {@code X-Workflow-Token} header (shared secret), không dùng JWT.
 * Path /internal/** được permit-all ở Spring Security nhưng token check xảy ra ở đây.
 */
@RestController
@RequestMapping("/internal/visits")
public class VisitWorkflowCallbackController {

    private final VisitService visitService;
    private final WorkflowCallbackProperties props;

    public VisitWorkflowCallbackController(VisitService visitService,
                                           WorkflowCallbackProperties props) {
        this.visitService = visitService;
        this.props = props;
    }

    @PatchMapping("/{id}/transition")
    public ResponseEntity<VisitResponse> transition(
            @PathVariable Long id,
            @RequestHeader("X-Workflow-Token") String token,
            @RequestBody @Valid VisitTransitionRequest req
    ) {
        // Constant-time so sánh tránh timing side-channel trên shared secret.
        if (!constantTimeEquals(props.callbackToken(), token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        VisitStatus target = parseTarget(req.targetStatus());

        // Idempotency: Camunda job worker là at-least-once. Redelivery của cùng 1 job khi
        // visit đã ở target state → trả 200 no-op thay vì để state machine throw (tránh
        // incident giả). Mirror saga pattern (markCompleted no-op khi status != PENDING).
        VisitResponse current = visitService.findById(id);
        if (current.status() == target) {
            return ResponseEntity.ok(current);
        }

        VisitResponse response = switch (target) {
            case IN_PROGRESS -> visitService.start(id);
            case COMPLETED   -> visitService.complete(id,
                    new CompleteVisitRequest(req.diagnosis(), req.treatment(), req.fee()));
            case CANCELLED   -> visitService.cancel(id, null, true);
            default -> throw new IllegalStateException("Unreachable target: " + target);
        };

        return ResponseEntity.ok(response);
    }

    /** Chỉ IN_PROGRESS/COMPLETED/CANCELLED là transition hợp lệ qua callback. */
    private static VisitStatus parseTarget(String targetStatus) {
        return switch (targetStatus) {
            case "IN_PROGRESS" -> VisitStatus.IN_PROGRESS;
            case "COMPLETED"   -> VisitStatus.COMPLETED;
            case "CANCELLED"   -> VisitStatus.CANCELLED;
            default -> throw new BadRequestAlertException(
                    "Trạng thái không hợp lệ: " + targetStatus, "Visit", "invalid-target-status");
        };
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }
}
