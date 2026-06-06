package com.mss301.petclinic.customers.service.impl;

import java.util.Set;

import org.springframework.web.multipart.MultipartFile;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

/**
 * Validate upload file (size + content-type) cho ảnh pet + owner avatar.
 * Chỉ accept image phổ thông: {@code image/jpeg}, {@code image/png}, {@code image/webp}.
 *
 * <p>Mirror {@code MediaValidator} của vets-service (package-private nên không share được
 * trực tiếp). Validate dựa trên header {@code MultipartFile.getContentType()} — defensive
 * nhưng KHÔNG bullet-proof; production thêm magic-byte check (Apache Tika).</p>
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
