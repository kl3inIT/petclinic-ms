package com.mss301.petclinic.customers.controller;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.customers.dto.req.OwnerRequest;
import com.mss301.petclinic.customers.dto.req.PetRequest;
import com.mss301.petclinic.customers.dto.req.UpdateOwnerRequest;
import com.mss301.petclinic.customers.dto.res.OwnerResponse;
import com.mss301.petclinic.customers.service.OwnerService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/owners")
@Tag(name = "Owners", description = "Owner & Pet management")
public class OwnerController {

    private final OwnerService service;

    public OwnerController(OwnerService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List owners (paginated)", description = "Filter optional by lastName (contains, case-insensitive). Use ?page=0&size=20&sort=lastName,asc.")
    public Page<OwnerResponse> listOwners(
            @RequestParam(required = false) String lastName,
            Pageable pageable
    ) {
        return service.findAll(lastName, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get owner by id")
    public OwnerResponse getOwner(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/me")
    @Operation(summary = "Get owner profile of current customer")
    public OwnerResponse getMyOwnerProfile(@AuthenticationPrincipal Jwt jwt) {
        return service.findById(resolveCustomerId(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create owner")
    public OwnerResponse createOwner(@RequestBody @Valid OwnerRequest request) {
        return service.create(request);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update owner by id")
    public OwnerResponse updateOwner(
            @PathVariable Long id,
            @RequestBody @Valid UpdateOwnerRequest request
    ) {
        return service.update(id, request);
    }

    @PatchMapping("/me")
    @Operation(summary = "Update owner profile of current customer")
    public OwnerResponse updateMyOwnerProfile(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid UpdateOwnerRequest request
    ) {
        return service.update(resolveCustomerId(jwt), request);
    }

    @PostMapping("/{id}/pets")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add pet to owner")
    public OwnerResponse addPet(
            @PathVariable Long id,
            @RequestBody @Valid PetRequest request
    ) {
        return service.addPet(id, request);
    }

    @PostMapping("/me/pets")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add pet to current customer")
    public OwnerResponse addMyPet(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid PetRequest request
    ) {
        return service.addPet(resolveCustomerId(jwt), request);
    }

    @PutMapping("/{id}/pets/{petId}")
    @Operation(summary = "Update pet in owner aggregate")
    public OwnerResponse updatePet(
            @PathVariable Long id,
            @PathVariable Long petId,
            @RequestBody @Valid PetRequest request
    ) {
        return service.updatePet(id, petId, request);
    }

    @PutMapping("/me/pets/{petId}")
    @Operation(summary = "Update current customer's pet")
    public OwnerResponse updateMyPet(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long petId,
            @RequestBody @Valid PetRequest request
    ) {
        return service.updatePet(resolveCustomerId(jwt), petId, request);
    }

    @DeleteMapping("/{id}/pets/{petId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove pet from owner aggregate")
    public void removePet(@PathVariable Long id, @PathVariable Long petId) {
        service.removePet(id, petId);
    }

    @DeleteMapping("/me/pets/{petId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove current customer's pet")
    public void removeMyPet(@AuthenticationPrincipal Jwt jwt, @PathVariable Long petId) {
        service.removePet(resolveCustomerId(jwt), petId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete owner by id")
    public void deleteOwner(@PathVariable Long id) {
        service.deleteById(id);
    }

    private static Long resolveCustomerId(Jwt jwt) {
        Object raw = jwt.getClaim("customerId");
        if (raw == null) {
            throw new BadRequestAlertException(
                    "Tai khoan chua duoc lien ket voi ho so khach hang. Vui long lien he le tan.",
                    "owner-me", "missing-customer-id");
        }
        if (!(raw instanceof Number n)) {
            throw new BadRequestAlertException(
                    "Claim 'customerId' phai la so.",
                    "owner-me", "invalid-customer-id-type");
        }
        return n.longValue();
    }
}
