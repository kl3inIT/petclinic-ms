package com.mss301.petclinic.customers.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.customers.dto.res.PetResponse;
import com.mss301.petclinic.customers.service.PetService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Standalone Pet endpoint — Pet thuộc Owner aggregate ở góc nhìn write
 * (CRUD qua /owners), nhưng cross-service consumers (visits-service) cần read
 * riêng để validate + lấy ownerId.
 */
@RestController
@RequestMapping("/api/v1/pets")
@Tag(name = "Pets", description = "Pet lookup (read-only) — write qua /owners")
public class PetController {

    private final PetService service;

    public PetController(PetService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List pets (paginated, optional filters)",
            description = "Filter optional: ownerId, petTypeId, isActive. "
                    + "Pageable nhận page/size/sort theo convention orval.")
    public Page<PetResponse> listPets(
            @RequestParam(required = false) Long ownerId,
            @RequestParam(required = false) Long petTypeId,
            @RequestParam(required = false) Boolean isActive,
            Pageable pageable
    ) {
        return service.findAll(ownerId, petTypeId, isActive, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get pet by id (returns ownerId for cross-service validation)")
    public PetResponse getPet(@PathVariable Long id) {
        return service.findById(id);
    }

    @PutMapping(path = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Admin upload/replace ảnh pet bất kỳ",
            description = "Multipart field 'file'. Max 10MB, image/jpeg|png|webp. Idempotent overwrite.")
    public PetResponse uploadPetPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return service.uploadPhoto(id, file);
    }

    @DeleteMapping("/{id}/photo")
    @Operation(summary = "Admin xoá ảnh pet bất kỳ")
    public PetResponse deletePetPhoto(@PathVariable Long id) {
        return service.deletePhoto(id);
    }
}
