package com.mss301.petclinic.vets.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.vets.dto.res.VetResponse;
import com.mss301.petclinic.vets.service.VetService;

/** Read-only, token-free projection for the local MCP demo adapter. */
@RestController
@RequestMapping("/internal/ai/vets")
public class AiReadModelController {

    private final VetService vetService;

    public AiReadModelController(VetService vetService) {
        this.vetService = vetService;
    }

    @GetMapping
    public Page<VetResponse> listVets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return vetService.findAll(null, null, null, PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 50)));
    }

    @GetMapping("/{id}")
    public VetResponse getVet(@PathVariable Long id) {
        return vetService.findById(id);
    }
}
