package com.mss301.petclinic.customers.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.customers.dto.res.OwnerResponse;
import com.mss301.petclinic.customers.dto.res.PetResponse;
import com.mss301.petclinic.customers.service.OwnerService;
import com.mss301.petclinic.customers.service.PetService;

/**
 * Narrow read model consumed only by the local MCP demo adapter.
 *
 * <p>It intentionally has no caller authentication and is therefore restricted to simple
 * read operations. Keep these paths off the public gateway and do not add mutation endpoints.
 */
@RestController
@RequestMapping("/internal/ai/customers")
public class AiReadModelController {

    private final OwnerService ownerService;
    private final PetService petService;

    public AiReadModelController(OwnerService ownerService, PetService petService) {
        this.ownerService = ownerService;
        this.petService = petService;
    }

    @GetMapping("/owners")
    public Page<OwnerResponse> listOwners(
            @RequestParam(required = false) String lastName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ownerService.findAll(lastName, PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 50)));
    }

    @GetMapping("/owners/{id}")
    public OwnerResponse getOwner(@PathVariable Long id) {
        return ownerService.findById(id);
    }

    @GetMapping("/pets/{id}")
    public PetResponse getPet(@PathVariable Long id) {
        return petService.findById(id);
    }
}
