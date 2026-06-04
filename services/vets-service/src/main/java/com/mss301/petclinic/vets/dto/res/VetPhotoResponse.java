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
 *
 * <p>{@code status}: PENDING | APPROVED | REJECTED. Customer/booking page chỉ
 * dùng URL khi APPROVED; vet thấy mọi status của chính mình; staff/admin thấy tất cả.</p>
 */
public record VetPhotoResponse(
        Long vetId,
        String contentType,
        Long sizeBytes,
        OffsetDateTime uploadedAt,
        URL presignedUrl,
        String status,
        String reviewedBy,
        OffsetDateTime reviewedAt,
        String rejectReason
) {
    public static VetPhotoResponse from(VetPhoto p, URL presignedUrl) {
        return new VetPhotoResponse(p.getVetId(), p.getContentType(), p.getSizeBytes(),
                p.getUploadedAt(), presignedUrl,
                p.getStatus(), p.getReviewedBy(), p.getReviewedAt(), p.getRejectReason());
    }
}
