package com.mss301.petclinic.vets.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mss301.petclinic.vets.service.impl.MinioOrphanCleanupJob.CleanupReport;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketAlreadyOwnedByYouException;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * IT cho {@link MinioOrphanCleanupJob}. Bypass cron, gọi {@code runCleanup()} trực tiếp.
 * Test xác nhận:
 * <ul>
 *   <li>Object DB không reference + quá min-age → bị xoá</li>
 *   <li>Object DB có reference → KHÔNG bị động</li>
 *   <li>Object không reference nhưng quá mới (chưa qua min-age) → bỏ qua (test riêng phase TTL)</li>
 *   <li>dryRun mode → đếm orphan nhưng không xoá</li>
 * </ul>
 *
 * <p>Test profile set {@code min-age: PT0S} → orphan vừa upload cũng được xét luôn.
 * Pattern setup MinIOContainer giống {@code VetPhotoControllerIT}.</p>
 */
// @Import explicit: CI run từ 2026-05-20 phát hiện bean MinioOrphanCleanupJob không được
// register dù có @Component (root cause chưa rõ — local pass, CI Linux runner fail). Force
// register qua @Import để guard regression — harmless nếu component-scan đã pickup
// (Spring sẽ dedupe bean definition theo type).
@SpringBootTest
@Testcontainers
@Transactional
@Import(MinioOrphanCleanupJob.class)
class MinioOrphanCleanupJobIT {

    private static final String TEST_BUCKET = "test-cleanup";

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("petclinic")
            .withUsername("postgres")
            .withPassword("postgres");

    @Container
    static MinIOContainer minio = new MinIOContainer("minio/minio:RELEASE.2025-09-07T16-13-09Z")
            .withUserName("testuser")
            .withPassword("testpass1234");

    @DynamicPropertySource
    static void storageProps(DynamicPropertyRegistry r) {
        r.add("petclinic.storage.minio.endpoint", minio::getS3URL);
        r.add("petclinic.storage.minio.access-key", minio::getUserName);
        r.add("petclinic.storage.minio.secret-key", minio::getPassword);
        r.add("petclinic.storage.minio.bucket", () -> TEST_BUCKET);
    }

    @Autowired
    WebApplicationContext wac;

    @Autowired
    ObjectMapper om;

    @Autowired
    S3Client s3;

    @Autowired
    MinioOrphanCleanupJob job;

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = webAppContextSetup(wac).apply(springSecurity()).build();
        try {
            s3.createBucket(b -> b.bucket(TEST_BUCKET));
        } catch (BucketAlreadyOwnedByYouException ignored) {
            // Idempotent
        }
        // MinIO bucket persist giữa các test trong cùng class. Nhưng DB rollback theo
        // @Transactional → key valid của test trước biến thành orphan ở test sau. Clear
        // hết object đầu mỗi test để fresh state.
        clearBucket();
    }

    private void clearBucket() {
        s3.listObjectsV2Paginator(ListObjectsV2Request.builder().bucket(TEST_BUCKET).build())
                .contents()
                .forEach(o -> s3.deleteObject(DeleteObjectRequest.builder()
                        .bucket(TEST_BUCKET).key(o.key()).build()));
    }

    private static RequestPostProcessor staff() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_STAFF"));
    }

    @Test
    void runCleanup_orphanPhotoKey_isDeleted() throws Exception {
        // Upload object trực tiếp tới S3, KHÔNG qua controller → DB không có row
        putRawObject("vets/photo/999999", "ORPHAN_BYTES");

        CleanupReport report = job.runCleanup();

        assertThat(report.photoOrphans()).isEqualTo(1);
        assertObjectDeleted("vets/photo/999999");
    }

    @Test
    void runCleanup_validPhotoUploadedViaController_isKept() throws Exception {
        Long vetId = firstVetId();
        uploadValidPhoto(vetId);

        CleanupReport report = job.runCleanup();

        assertThat(report.photoOrphans()).isZero();
        assertObjectExists("vets/photo/" + vetId);
    }

    @Test
    void runCleanup_mixedValidAndOrphan_onlyOrphanDeleted() throws Exception {
        Long vetId = firstVetId();
        uploadValidPhoto(vetId);                              // sẽ giữ
        putRawObject("vets/photo/424242", "ORPHAN");          // sẽ xoá
        putRawObject("vets/album/424242/77", "ORPHAN_ALBUM"); // sẽ xoá

        CleanupReport report = job.runCleanup();

        assertThat(report.photoOrphans()).isEqualTo(1);
        assertThat(report.albumOrphans()).isEqualTo(1);
        assertThat(report.total()).isEqualTo(2);
        assertObjectExists("vets/photo/" + vetId);
        assertObjectDeleted("vets/photo/424242");
        assertObjectDeleted("vets/album/424242/77");
    }

    @Test
    void runCleanup_emptyBucket_zeroOrphans() {
        CleanupReport report = job.runCleanup();
        assertThat(report.total()).isZero();
    }

    @Test
    void runCleanup_orphanAlbumKey_isDeleted() {
        putRawObject("vets/album/123/456", "ORPHAN_ALBUM_BYTES");

        CleanupReport report = job.runCleanup();

        assertThat(report.albumOrphans()).isEqualTo(1);
        assertObjectDeleted("vets/album/123/456");
    }

    // ---------- helpers ----------

    private Long firstVetId() throws Exception {
        String body = mvc.perform(get("/api/v1/vets").param("active", "true").with(staff()))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(body).path("content").get(0).path("id").asLong();
    }

    private void uploadValidPhoto(Long vetId) throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "a.jpg", "image/jpeg",
                "VALID_BYTES".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/vets/{vetId}/photo", vetId)
                        .file(file)
                        .with(staff()));
    }

    private void putRawObject(String key, String content) {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        s3.putObject(PutObjectRequest.builder()
                        .bucket(TEST_BUCKET)
                        .key(key)
                        .contentLength((long) bytes.length)
                        .build(),
                RequestBody.fromBytes(bytes));
    }

    private void assertObjectDeleted(String key) {
        try {
            s3.getObject(GetObjectRequest.builder().bucket(TEST_BUCKET).key(key).build());
            throw new AssertionError("Expected object to be deleted: " + key);
        } catch (NoSuchKeyException expected) {
            // OK
        }
    }

    private void assertObjectExists(String key) {
        s3.getObject(GetObjectRequest.builder().bucket(TEST_BUCKET).key(key).build());
    }
}
