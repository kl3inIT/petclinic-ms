package com.mss301.petclinic.customers.controller;

import com.mss301.petclinic.customers.dto.res.PetResponse;
import com.mss301.petclinic.customers.exception.PetNotFoundException;
import com.mss301.petclinic.customers.repository.PetRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Standalone Pet endpoint — Pet thuộc Owner aggregate ở góc nhìn write (CRUD qua /owners),
 * nhưng cross-service consumers (visits-service) cần read riêng để validate + lấy ownerId.
 */
@RestController
@RequestMapping("/api/v1/pets")
@Tag(name = "Pets", description = "Pet lookup (read-only) — write qua /owners")
public class PetController {

    private final PetRepository petRepository;

    public PetController(PetRepository petRepository) {
        this.petRepository = petRepository;
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get pet by id (returns ownerId for cross-service validation)")
    public PetResponse get(@PathVariable Long id) {
        return petRepository.findById(id)
                .map(PetResponse::from)
                .orElseThrow(() -> new PetNotFoundException(id.toString()));
    }
}
