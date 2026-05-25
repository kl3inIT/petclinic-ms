package com.mss301.petclinic.customers.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.customers.dto.res.PetTypeResponse;
import com.mss301.petclinic.customers.service.PetTypeService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/pet-types")
@Tag(name = "PetTypes", description = "Catalog loại pet (read-only) — FE dropdown khi tạo/sửa Pet")
public class PetTypeController {

    private final PetTypeService service;

    public PetTypeController(PetTypeService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List pet types (sắp xếp theo display_order)")
    public List<PetTypeResponse> listPetTypes() {
        return service.findAll();
    }
}
