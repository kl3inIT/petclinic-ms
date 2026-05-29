package com.mss301.petclinic.common.storage;

import java.io.InputStream;
import java.net.URL;
import java.time.Duration;
import java.util.List;

/**
 * Abstraction tách HTTP layer khỏi storage backend. Ship 1 impl
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
     * Tải object về dạng stream — dùng khi BE phải proxy nội dung qua endpoint có kiểm
     * quyền (vd PDF đơn thuốc: chỉ chủ nuôi/vet phụ trách mới được tải, không phát hành
     * presigned URL công khai). Caller chịu trách nhiệm {@code close()} stream.
     */
    InputStream download(String key);

    /**
     * Presigned GET URL. FE dùng URL này fetch trực tiếp từ MinIO/S3, không qua BE proxy
     * → tiết kiệm băng thông + giảm load BE. Dùng cho nội dung không nhạy cảm (vd ảnh vet).
     */
    URL presignedGet(String key, Duration ttl);

    /**
     * List objects bắt đầu bằng {@code prefix}, kèm metadata (lastModified, size).
     * Dùng cho orphan-cleanup job đối chiếu MinIO ↔ DB — lastModified cho phép
     * skip object vừa upload nhưng DB chưa save xong (race window).
     *
     * <p>Trả List eager — bucket dev thường nhỏ; nếu vượt &gt;10k objects nên chuyển
     * sang Iterator/Stream paginator để không OOM.</p>
     */
    List<StorageObject> list(String prefix);
}
