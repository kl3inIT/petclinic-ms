package com.mss301.petclinic.vets.service.impl;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.mss301.petclinic.common.storage.StorageObject;
import com.mss301.petclinic.common.storage.StorageService;
import com.mss301.petclinic.vets.config.StorageCleanupProperties;
import com.mss301.petclinic.vets.repository.VetAlbumPhotoRepository;
import com.mss301.petclinic.vets.repository.VetPhotoRepository;

/**
 * Scheduled job rà MinIO ↔ DB, xoá object mồ côi (S3 có, DB không reference).
 *
 * <p>Origin của orphan: rollback transaction sau khi đã upload S3, hoặc crash giữa
 * upload và DB save. Cleanup chạy 3 AM hằng ngày (configurable qua
 * {@link StorageCleanupProperties#cron()}) — giờ idle để tránh đua với traffic thật.</p>
 *
 * <p>{@code petclinic.storage.cleanup.enabled=false} tắt schedule, nhưng vẫn giữ bean
 * để integration test có thể gọi {@link #runCleanup()} trực tiếp.</p>
 *
 * <p><b>KHÔNG</b> đảo lại: DB row trỏ tới object S3 không tồn tại — đó là dấu hiệu data
 * corruption nghiêm trọng hơn, cần alert manual chứ không tự fix.</p>
 */
@Component
public class MinioOrphanCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(MinioOrphanCleanupJob.class);

    static final String PHOTO_PREFIX = "vets/photo/";
    static final String ALBUM_PREFIX = "vets/album/";

    private final StorageService storage;
    private final VetPhotoRepository photoRepository;
    private final VetAlbumPhotoRepository albumRepository;
    private final StorageCleanupProperties cleanupProps;

    public MinioOrphanCleanupJob(StorageService storage,
                                 VetPhotoRepository photoRepository,
                                 VetAlbumPhotoRepository albumRepository,
                                 StorageCleanupProperties cleanupProps) {
        this.storage = storage;
        this.photoRepository = photoRepository;
        this.albumRepository = albumRepository;
        this.cleanupProps = cleanupProps;
    }

    @Scheduled(cron = "${petclinic.storage.cleanup.cron:0 0 3 * * *}")
    public void scheduledCleanup() {
        if (!cleanupProps.enabled()) {
            return;
        }
        runCleanup();
    }

    /**
     * Package-private để IT gọi trực tiếp thay vì đợi cron.
     *
     * <p>M1+M2 fix: NO {@code @Transactional} ở method-level — Spring Data repo
     * method tự mở/đóng tx riêng cho mỗi {@code findAllObjectKeys()} call (default
     * REQUIRED). Trước đây {@code @Transactional(readOnly=true)} wrap cả method
     * → DB connection giữ trong suốt network I/O với MinIO (có thể vài phút khi
     * bucket lớn) → connection pool starvation risk.
     *
     * <p>Projection query (M1): trả {@code List<String>} thay vì hydrate entity vào
     * persistence context — scale 10K vet vẫn nhẹ.
     */
    public CleanupReport runCleanup() {
        Instant cutoff = Instant.now().minus(cleanupProps.minAge());

        // Snapshot key set qua projection — mỗi call tự tx, connection trả pool ngay.
        // Race: upload xen vào sau snapshot, key mới CHƯA có trong validKeys nhưng
        // cutoff bảo vệ (object mới chưa quá tuổi nên sweep bỏ qua).
        Set<String> validPhotoKeys = new HashSet<>(photoRepository.findAllObjectKeys());
        Set<String> validAlbumKeys = new HashSet<>(albumRepository.findAllObjectKeys());

        // S3 sweep ngoài tx — list + delete S3 chạy với network latency tự do,
        // KHÔNG khoá DB connection.
        int photoOrphans = sweep(PHOTO_PREFIX, validPhotoKeys, cutoff);
        int albumOrphans = sweep(ALBUM_PREFIX, validAlbumKeys, cutoff);

        log.info("MinIO cleanup done: photo orphans={}, album orphans={}, dryRun={}",
                photoOrphans, albumOrphans, cleanupProps.dryRun());
        return new CleanupReport(photoOrphans, albumOrphans);
    }

    private int sweep(String prefix, Set<String> validKeys, Instant cutoff) {
        List<StorageObject> objects = storage.list(prefix);
        int orphanCount = 0;
        for (StorageObject obj : objects) {
            if (validKeys.contains(obj.key())) {
                continue;
            }
            if (obj.lastModified().isAfter(cutoff)) {
                // Quá mới → có thể là upload đang dở (DB save chưa flush). Bỏ qua, lần
                // chạy sau (sau minAge) sẽ thấy lại nếu thật sự orphan.
                log.debug("Skip recent object below minAge: {} (lastModified={})", obj.key(), obj.lastModified());
                continue;
            }
            orphanCount++;
            if (cleanupProps.dryRun()) {
                log.warn("[DRY-RUN] Would delete orphan: {} (size={}B, lastModified={})",
                        obj.key(), obj.sizeBytes(), obj.lastModified());
            } else {
                log.warn("Deleting orphan: {} (size={}B, lastModified={})",
                        obj.key(), obj.sizeBytes(), obj.lastModified());
                storage.delete(obj.key());
            }
        }
        return orphanCount;
    }

    /** Báo cáo số orphan phát hiện (đã xoá nếu !dryRun, ghi log nếu dryRun). */
    public record CleanupReport(int photoOrphans, int albumOrphans) {
        public int total() {
            return photoOrphans + albumOrphans;
        }
    }
}
