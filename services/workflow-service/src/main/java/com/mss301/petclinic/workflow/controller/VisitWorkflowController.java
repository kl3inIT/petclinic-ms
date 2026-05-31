package com.mss301.petclinic.workflow.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.workflow.dto.req.CompleteExamRequest;
import com.mss301.petclinic.workflow.service.VisitWorkflowService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/workflows/visits")
@Tag(name = "Visit Workflows", description = "Domain actions for visit booking workflow — staff/vet click buttons, no JSON variables needed")
public class VisitWorkflowController {

    private final VisitWorkflowService visitWorkflowService;

    public VisitWorkflowController(VisitWorkflowService visitWorkflowService) {
        this.visitWorkflowService = visitWorkflowService;
    }

    @PostMapping("/{visitId}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "approveVisit", description = "Duyệt lịch hẹn — staff/manager xác nhận. Tự set approved=true trong Camunda.")
    public void approveVisit(@PathVariable Long visitId) {
        visitWorkflowService.approveVisit(visitId);
    }

    @PostMapping("/{visitId}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "rejectVisit", description = "Từ chối lịch hẹn — staff/manager từ chối. Tự set approved=false → visit sẽ CANCELLED.")
    public void rejectVisit(@PathVariable Long visitId) {
        visitWorkflowService.rejectVisit(visitId);
    }

    @PostMapping("/{visitId}/start")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "startVisitExam", description = "Bắt đầu khám — bác sĩ xác nhận bắt đầu. Visit chuyển sang IN_PROGRESS.")
    public void startVisitExam(@PathVariable Long visitId) {
        visitWorkflowService.startExam(visitId);
    }

    @PostMapping("/{visitId}/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "completeVisitExam", description = "Hoàn thành khám — bác sĩ nhập kết quả. Visit chuyển sang COMPLETED.")
    public void completeVisitExam(
            @PathVariable Long visitId,
            @Valid @RequestBody CompleteExamRequest request) {
        visitWorkflowService.completeExam(
                visitId, request.diagnosis(), request.treatment(), request.fee());
    }
}
