package com.mss301.petclinic.vets.controller;

import com.mss301.petclinic.vets.dto.res.SpecialtyResponse;
import com.mss301.petclinic.vets.service.SpecialtyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/specialties")
@Tag(name = "Specialties", description = "Veterinarian specialties (read-only, seeded via Liquibase)")
public class SpecialtyController {

    private final SpecialtyService service;

    public SpecialtyController(SpecialtyService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List all specialties")
    public List<SpecialtyResponse> list() {
        return service.findAll();
    }
}
