package com.mss301.petclinic.vets.service;

import java.io.InputStream;
import java.net.URL;
import java.time.Duration;

/**
 * Abstraction tách HTTP layer khỏi storage backend. Phase E2 ship 1 impl
 * ({@code MinioStorageService} qua AWS S3 SDK v2) — đổi sang AWS S3, R2, Backblaze B2
 * mà không sửa controller/service layer.
 */
public interface StorageService {

    /**
     * Upload object. Overwrite nếu key đã tồn tại — caller responsibility nếu cần versioning.
     */
    void upload(String key, String contentType, InputStream input, long contentLength);

    void delete(String key);

    /**
     * Presigned GET URL. FE dùng URL này fetch trực tiếp từ MinIO/S3, không qua BE proxy
     * → tiết kiệm băng thông + giảm load BE.
     */
    URL presignedGet(String key, Duration ttl);
}
