package com.mss301.petclinic.vets.dto.res;

import java.net.URL;
import java.time.OffsetDateTime;

import com.mss301.petclinic.vets.model.VetAlbumPhoto;

public record VetAlbumPhotoResponse(
        Long id,
        Long vetId,
        String caption,
        String contentType,
        Long sizeBytes,
        OffsetDateTime uploadedAt,
        URL presignedUrl
) {
    public static VetAlbumPhotoResponse from(VetAlbumPhoto p, URL presignedUrl) {
        return new VetAlbumPhotoResponse(p.getId(), p.getVetId(), p.getCaption(),
                p.getContentType(), p.getSizeBytes(), p.getUploadedAt(), presignedUrl);
    }
}
