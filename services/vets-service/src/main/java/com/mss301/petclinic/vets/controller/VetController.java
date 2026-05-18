package com.mss301.petclinic.vets.controller;

import com.mss301.petclinic.vets.dto.req.UpdateVetRequest;
import com.mss301.petclinic.vets.dto.req.VetRequest;
import com.mss301.petclinic.vets.dto.res.VetResponse;
import com.mss301.petclinic.vets.service.VetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/vets")
@Tag(name = "Vets", description = "Veterinarian management")
public class VetController {

    private final VetService service;

    public VetController(VetService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List vets (paginated)", description = "Filter optional by lastName (contains, case-insensitive) and/or specialtyId. Use ?page=0&size=20&sort=lastName,asc.")
    public Page<VetResponse> listVets(
            @RequestParam(required = false) String lastName,
            @RequestParam(required = false) Long specialtyId,
            Pageable pageable
    ) {
        return service.findAll(lastName, specialtyId, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get vet by id")
    public VetResponse getVet(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create vet", description = "specialtyNames must match existing specialties (seeded via Liquibase).")
    public VetResponse createVet(@RequestBody @Valid VetRequest request) {
        return service.create(request);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update vet — partial (null fields = không đổi)",
            description = "specialtyNames null=giữ nguyên, []=clear all, [...]=REPLACE. " +
                          "specialty name không tồn tại → 400 BadRequestAlertException.")
    public VetResponse updateVet(@PathVariable Long id, @RequestBody UpdateVetRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete vet by id")
    public void deleteVet(@PathVariable Long id) {
        service.deleteById(id);
    }
}
