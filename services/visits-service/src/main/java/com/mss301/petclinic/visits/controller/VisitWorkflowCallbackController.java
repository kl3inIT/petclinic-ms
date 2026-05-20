package com.mss301.petclinic.visits.controller;

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
        if (!props.callbackToken().equals(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        VisitResponse response = switch (req.targetStatus()) {
            case "IN_PROGRESS" -> visitService.start(id);
            case "COMPLETED"   -> visitService.complete(id,
                    new CompleteVisitRequest(req.diagnosis(), req.treatment(), req.fee()));
            case "CANCELLED"   -> visitService.cancel(id, null, true);
            default -> throw new BadRequestAlertException(
                    "Trạng thái không hợp lệ: " + req.targetStatus(), "Visit", "invalid-target-status");
        };

        return ResponseEntity.ok(response);
    }
}
