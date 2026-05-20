package com.mss301.petclinic.vets.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
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

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketAlreadyOwnedByYouException;

/**
 * Integration test cho VetPhotoController với Testcontainers MinIO.
 *
 * <p>{@code @DynamicPropertySource} override storage props với container endpoint/creds.
 * Bucket được tạo lại trong {@code @BeforeEach} (idempotent qua catch
 * {@link BucketAlreadyOwnedByYouException}) — đảm bảo test deterministic bất kể chạy
 * thứ tự nào.</p>
 */
@SpringBootTest
@Testcontainers
@Transactional
class VetPhotoControllerIT {

    private static final String TEST_BUCKET = "test-avatars";

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

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = webAppContextSetup(wac).apply(springSecurity()).build();
        try {
            s3.createBucket(b -> b.bucket(TEST_BUCKET));
        } catch (BucketAlreadyOwnedByYouException ignored) {
            // Idempotent — bucket persist giữa các test trong cùng container
        }
    }

    private static RequestPostProcessor staff() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_STAFF"));
    }

    // ---------- GET ----------

    @Test
    void getVetPhoto_noPhotoUploaded_returns404() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(get("/api/v1/vets/{vetId}/photo", vetId).with(staff()))
                .andExpect(status().isNotFound());
    }

    @Test
    void getVetPhoto_existing_returnsMetadataAndPresignedUrl() throws Exception {
        Long vetId = firstVetId();
        uploadPhoto(vetId, "avatar.jpg", "image/jpeg", "FAKE_JPEG_BYTES".getBytes(StandardCharsets.UTF_8));

        mvc.perform(get("/api/v1/vets/{vetId}/photo", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vetId").value(vetId))
                .andExpect(jsonPath("$.contentType").value("image/jpeg"))
                .andExpect(jsonPath("$.sizeBytes").isNumber())
                .andExpect(jsonPath("$.presignedUrl").isString());
    }

    // ---------- UPLOAD ----------

    @Test
    void uploadVetPhoto_validJpeg_returns200WithMetadata() throws Exception {
        Long vetId = firstVetId();
        MockMultipartFile file = new MockMultipartFile(
                "file", "avatar.jpg", "image/jpeg",
                "FAKE_JPEG_BYTES".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/vets/{vetId}/photo", vetId)
                        .file(file)
                        .with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vetId").value(vetId))
                .andExpect(jsonPath("$.contentType").value("image/jpeg"))
                .andExpect(jsonPath("$.presignedUrl").isString());
    }

    @Test
    void uploadVetPhoto_overwriteSameKey_isIdempotent() throws Exception {
        Long vetId = firstVetId();
        uploadPhoto(vetId, "v1.jpg", "image/jpeg", "V1".getBytes(StandardCharsets.UTF_8));
        uploadPhoto(vetId, "v2.png", "image/png", "V2_LARGER".getBytes(StandardCharsets.UTF_8));

        // Sau lần upload thứ 2, contentType phải là image/png (overwrite không phải merge)
        mvc.perform(get("/api/v1/vets/{vetId}/photo", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.sizeBytes").value(9));  // "V2_LARGER" = 9 bytes
    }

    @Test
    void uploadVetPhoto_unsupportedContentType_returns400() throws Exception {
        Long vetId = firstVetId();
        MockMultipartFile file = new MockMultipartFile(
                "file", "doc.txt", "text/plain",
                "not an image".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/vets/{vetId}/photo", vetId)
                        .file(file)
                        .with(staff()))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-PetClinic-Alert", "error.unsupported-media"));
    }

    @Test
    void uploadVetPhoto_emptyFile_returns400() throws Exception {
        Long vetId = firstVetId();
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.jpg", "image/jpeg", new byte[0]);

        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/vets/{vetId}/photo", vetId)
                        .file(file)
                        .with(staff()))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-PetClinic-Alert", "error.file-empty"));
    }

    @Test
    void uploadVetPhoto_vetNotFound_returns404() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "a.jpg", "image/jpeg",
                "X".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/vets/{vetId}/photo", 999_999L)
                        .file(file)
                        .with(staff()))
                .andExpect(status().isNotFound());
    }

    // ---------- DELETE ----------

    @Test
    void deleteVetPhoto_existing_returns204_thenGetReturns404() throws Exception {
        Long vetId = firstVetId();
        uploadPhoto(vetId, "a.jpg", "image/jpeg", "X".getBytes(StandardCharsets.UTF_8));

        mvc.perform(delete("/api/v1/vets/{vetId}/photo", vetId).with(staff()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/vets/{vetId}/photo", vetId).with(staff()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteVetPhoto_noPhoto_returns404() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(delete("/api/v1/vets/{vetId}/photo", vetId).with(staff()))
                .andExpect(status().isNotFound());
    }

    // ---------- helpers ----------

    private Long firstVetId() throws Exception {
        String body = mvc.perform(get("/api/v1/vets").param("active", "true").with(staff()))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(body).path("content").get(0).path("id").asLong();
    }

    private void uploadPhoto(Long vetId, String filename, String contentType, byte[] bytes) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", filename, contentType, bytes);
        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/vets/{vetId}/photo", vetId)
                        .file(file)
                        .with(staff()))
                .andExpect(status().isOk());
    }
}
