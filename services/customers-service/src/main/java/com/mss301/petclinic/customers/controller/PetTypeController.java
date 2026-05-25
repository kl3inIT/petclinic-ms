package com.mss301.petclinic.customers.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.customers.dto.req.PetTypeRequest;
import com.mss301.petclinic.customers.dto.res.PetTypeResponse;
import com.mss301.petclinic.customers.service.PetTypeService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/pet-types")
@Tag(name = "PetTypes", description = "Catalog loại pet — read mọi role, write ADMIN")
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

    @GetMapping("/{id}")
    @Operation(summary = "Get pet type by id")
    public PetTypeResponse getPetType(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create pet type (ADMIN only)")
    public PetTypeResponse createPetType(@RequestBody @Valid PetTypeRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update pet type (ADMIN only)")
    public PetTypeResponse updatePetType(
            @PathVariable Long id,
            @RequestBody @Valid PetTypeRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete pet type (ADMIN only — chặn nếu còn pet đang dùng)")
    public void deletePetType(@PathVariable Long id) {
        service.deleteById(id);
    }
}
