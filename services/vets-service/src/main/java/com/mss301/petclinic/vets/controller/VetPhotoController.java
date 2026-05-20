package com.mss301.petclinic.vets.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.vets.dto.res.VetPhotoResponse;
import com.mss301.petclinic.vets.service.VetPhotoService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Avatar 1-1 của vet. PUT (idempotent overwrite) + GET (metadata + presigned URL) + DELETE.
 * Multipart form field tên {@code file}. Method unique cross-service:
 * {@code uploadVetPhoto}, {@code getVetPhoto}, {@code deleteVetPhoto}.
 */
@RestController
@RequestMapping("/api/v1/vets/{vetId}/photo")
@Tag(name = "Vet Photo", description = "Avatar 1-1 của veterinarian (binary ở MinIO)")
public class VetPhotoController {

    private final VetPhotoService service;

    public VetPhotoController(VetPhotoService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
            summary = "Get photo metadata + presigned URL",
            description = "Trả 404 nếu vet chưa upload photo. Presigned URL TTL config qua " +
                          "petclinic.storage.minio.presigned-ttl (default 1h)."
    )
    public VetPhotoResponse getVetPhoto(@PathVariable Long vetId) {
        return service.getPhoto(vetId);
    }

    @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Upload or replace vet photo (idempotent)",
            description = "Multipart field 'file'. Max 10MB (config). Content-type: image/jpeg|png|webp. " +
                          "File quá lớn → 400 error.file-too-large. Type khác → 400 error.unsupported-media. " +
                          "Re-upload overwrite cùng key MinIO + upsert DB row."
    )
    public VetPhotoResponse uploadVetPhoto(
            @PathVariable Long vetId,
            @RequestParam("file") MultipartFile file
    ) {
        return service.uploadPhoto(vetId, file);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete vet photo (xoá MinIO object trước, DB row sau)")
    public void deleteVetPhoto(@PathVariable Long vetId) {
        service.deletePhoto(vetId);
    }
}
