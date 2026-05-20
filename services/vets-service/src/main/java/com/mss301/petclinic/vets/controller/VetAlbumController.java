package com.mss301.petclinic.vets.controller;

import java.net.URI;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.mss301.petclinic.vets.dto.res.VetAlbumPhotoResponse;
import com.mss301.petclinic.vets.service.VetAlbumService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Gallery 1-N của vet. Method name unique cross-service:
 * {@code listVetAlbumPhotos}, {@code uploadVetAlbumPhoto}, {@code deleteVetAlbumPhoto}.
 */
@RestController
@RequestMapping("/api/v1/vets/{vetId}/album")
@Tag(name = "Vet Album", description = "Gallery 1-N của veterinarian (binary ở MinIO)")
public class VetAlbumController {

    private final VetAlbumService service;

    public VetAlbumController(VetAlbumService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
            summary = "List album photos (paginated, kèm presigned URL từng item)",
            description = "Vet không tồn tại → 404. Use ?page=0&size=20&sort=uploadedAt,desc."
    )
    public Page<VetAlbumPhotoResponse> listVetAlbumPhotos(@PathVariable Long vetId, Pageable pageable) {
        return service.listPhotos(vetId, pageable);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Upload photo to album",
            description = "Multipart 'file' (required) + 'caption' (optional). " +
                          "Validation giống photo. 201 + Location header. Vet không tồn tại → 404."
    )
    public ResponseEntity<VetAlbumPhotoResponse> uploadVetAlbumPhoto(
            @PathVariable Long vetId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption
    ) {
        VetAlbumPhotoResponse created = service.uploadPhoto(vetId, file, caption);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @DeleteMapping("/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete album photo (path-tamper qua vet khác → 404)")
    public void deleteVetAlbumPhoto(@PathVariable Long vetId, @PathVariable Long photoId) {
        service.deletePhoto(vetId, photoId);
    }
}
