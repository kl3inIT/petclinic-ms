package com.mss301.petclinic.vets.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.vets.dto.req.WorkScheduleRequest;
import com.mss301.petclinic.vets.dto.res.WorkScheduleSlotResponse;
import com.mss301.petclinic.vets.service.WorkScheduleService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Lịch trực tuần của vet (template). PUT idempotent — body là full state mới,
 * service replace toàn bộ. KHÔNG dùng PATCH (incremental add/remove) ở phase này;
 * nếu cần granular operations sau, mở route phụ {@code /work-schedule/slots/{workday}/{workHour}}.
 */
@RestController
@RequestMapping("/api/v1/vets/{vetId}/work-schedule")
@Tag(name = "Vet Work Schedule", description = "Weekly availability template (Workday × WorkHour)")
public class WorkScheduleController {

    private final WorkScheduleService service;

    public WorkScheduleController(WorkScheduleService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
            summary = "List work-schedule slots of a vet",
            description = "Trả empty list nếu vet chưa set lịch. 404 nếu vet không tồn tại. " +
                          "Slot sort theo (workday Mon→Sun, workHour 8h→20h)."
    )
    public List<WorkScheduleSlotResponse> listVetWorkSchedule(@PathVariable Long vetId) {
        return service.findAllByVetId(vetId);
    }

    @PutMapping
    @Operation(
            summary = "Replace work-schedule of a vet (idempotent)",
            description = "Body: { slots: [{workday, workHour}, ...] }. " +
                          "Empty slots = clear all (tương đương DELETE). " +
                          "Duplicate slot trong request → 400 error.slot-duplicate. " +
                          "Invalid enum value → 400 ProblemDetail. " +
                          "Vet không tồn tại → 404."
    )
    public List<WorkScheduleSlotResponse> replaceVetWorkSchedule(
            @PathVariable Long vetId,
            @RequestBody @Valid WorkScheduleRequest request
    ) {
        return service.replaceAll(vetId, request);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Clear all work-schedule slots of a vet")
    public void clearVetWorkSchedule(@PathVariable Long vetId) {
        service.clearAll(vetId);
    }
}
