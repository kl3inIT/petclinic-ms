package com.mss301.petclinic.vets.dto.res;

import java.net.URL;
import java.time.OffsetDateTime;

import com.mss301.petclinic.vets.model.VetPhoto;

/**
 * Photo metadata + presigned URL FE dùng để fetch trực tiếp từ MinIO/S3.
 *
 * <p>{@code presignedUrl} có TTL (config qua {@code petclinic.storage.minio.presigned-ttl},
 * mặc định 1h) — FE cache trong RAM, không persist. Sau TTL gọi lại GET endpoint
 * để lấy URL mới.</p>
 */
public record VetPhotoResponse(
        Long vetId,
        String contentType,
        Long sizeBytes,
        OffsetDateTime uploadedAt,
        URL presignedUrl
) {
    public static VetPhotoResponse from(VetPhoto p, URL presignedUrl) {
        return new VetPhotoResponse(p.getVetId(), p.getContentType(), p.getSizeBytes(),
                p.getUploadedAt(), presignedUrl);
    }
}
