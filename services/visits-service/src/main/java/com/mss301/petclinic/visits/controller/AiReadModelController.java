package com.mss301.petclinic.visits.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.visits.dto.res.VisitResponse;
import com.mss301.petclinic.visits.model.VisitStatus;
import com.mss301.petclinic.visits.service.VisitService;

/** Read-only, token-free projection for the local MCP demo adapter. */
@RestController
@RequestMapping("/internal/ai/visits")
public class AiReadModelController {

    private final VisitService visitService;

    public AiReadModelController(VisitService visitService) {
        this.visitService = visitService;
    }

    @GetMapping
    public Page<VisitResponse> searchVisits(
            @RequestParam(required = false) Long petId,
            @RequestParam(required = false) Long vetId,
            @RequestParam(required = false) VisitStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return visitService.search(null, vetId, petId, status, null, null,
                PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 50)));
    }

    @GetMapping("/{id}")
    public VisitResponse getVisit(@PathVariable Long id) {
        return visitService.findById(id);
    }
}
