package com.mss301.petclinic.vets.service.impl;

import java.util.Set;

import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

/**
 * Validate upload file (size + content-type) một nơi — share giữa {@code VetPhotoServiceImpl}
 * và {@code VetAlbumServiceImpl}. Phase E2 chỉ accept image format phổ thông:
 * {@code image/jpeg}, {@code image/png}, {@code image/webp}. GIF intentionally bị loại
 * (avatar animation phong cách MySpace 2005).
 *
 * <p>Validate dựa trên {@code MultipartFile.getContentType()} header — defensive nhưng
 * KHÔNG bullet-proof (attacker có thể set header bất kỳ). Đối với production-grade,
 * thêm magic-byte check qua Apache Tika hoặc {@code java.net.URLConnection.guessContentTypeFromStream}.</p>
 */
final class MediaValidator {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );

    private MediaValidator() {}

    static void validate(MultipartFile file, String entityName, long maxFileSizeBytes) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestAlertException("File must not be empty", entityName, "file-empty");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new BadRequestAlertException(
                    "File too large: " + file.getSize() + " bytes (max " + maxFileSizeBytes + ")",
                    entityName,
                    "file-too-large"
            );
        }
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_CONTENT_TYPES.contains(ct.toLowerCase())) {
            throw new BadRequestAlertException(
                    "Unsupported content type: " + ct + " (allowed: " + ALLOWED_CONTENT_TYPES + ")",
                    entityName,
                    "unsupported-media"
            );
        }
    }
}
