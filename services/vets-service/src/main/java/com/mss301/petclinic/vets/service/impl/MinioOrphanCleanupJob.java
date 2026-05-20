package com.mss301.petclinic.vets.service.impl;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.vets.config.StorageCleanupProperties;
import com.mss301.petclinic.vets.repository.VetAlbumPhotoRepository;
import com.mss301.petclinic.vets.repository.VetPhotoRepository;
import com.mss301.petclinic.vets.service.StorageObject;
import com.mss301.petclinic.vets.service.StorageService;

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
     * Package-private để IT gọi trực tiếp thay vì đợi cron. Wrap trong @Transactional(readOnly)
     * để Hibernate session đảm bảo findAll consistent snapshot.
     */
    @Transactional(readOnly = true)
    public CleanupReport runCleanup() {
        Instant cutoff = Instant.now().minus(cleanupProps.minAge());

        // Đọc DB TRƯỚC khi list S3 → nếu có upload xen vào lúc list S3, key mới sẽ
        // CHƯA xuất hiện trong dbKeys nhưng cutoff sẽ bảo vệ (object mới chưa quá tuổi).
        Set<String> validPhotoKeys = photoRepository.findAll().stream()
                .map(p -> p.getObjectKey())
                .collect(Collectors.toSet());
        Set<String> validAlbumKeys = albumRepository.findAll().stream()
                .map(p -> p.getObjectKey())
                .collect(Collectors.toSet());

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
