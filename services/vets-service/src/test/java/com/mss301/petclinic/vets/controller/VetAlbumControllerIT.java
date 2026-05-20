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
 * Integration test cho VetAlbumController với Testcontainers MinIO.
 * Container + bucket setup pattern giống {@link VetPhotoControllerIT}.
 */
@SpringBootTest
@Testcontainers
@Transactional
class VetAlbumControllerIT {

    private static final String TEST_BUCKET = "test-album";

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
            // Idempotent
        }
    }

    private static RequestPostProcessor staff() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_STAFF"));
    }

    // ---------- LIST ----------

    @Test
    void listVetAlbumPhotos_empty_returnsZero() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(get("/api/v1/vets/{vetId}/album", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void listVetAlbumPhotos_vetNotFound_returns404() throws Exception {
        mvc.perform(get("/api/v1/vets/{vetId}/album", 999_999L).with(staff()))
                .andExpect(status().isNotFound());
    }

    @Test
    void listVetAlbumPhotos_multipleUploads_returnsCorrectCount() throws Exception {
        Long vetId = firstVetId();
        uploadAlbumPhoto(vetId, "First", "1.jpg", "image/jpeg");
        uploadAlbumPhoto(vetId, "Second", "2.png", "image/png");

        mvc.perform(get("/api/v1/vets/{vetId}/album", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    // ---------- UPLOAD ----------

    @Test
    void uploadVetAlbumPhoto_valid_returns201WithLocationAndPresignedUrl() throws Exception {
        Long vetId = firstVetId();
        MockMultipartFile file = new MockMultipartFile(
                "file", "shot.webp", "image/webp",
                "WEBP_BYTES".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/v1/vets/{vetId}/album", vetId)
                        .file(file)
                        .param("caption", "Pet surgery 2025")
                        .with(staff()))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.vetId").value(vetId))
                .andExpect(jsonPath("$.caption").value("Pet surgery 2025"))
                .andExpect(jsonPath("$.contentType").value("image/webp"))
                .andExpect(jsonPath("$.presignedUrl").isString());
    }

    @Test
    void uploadVetAlbumPhoto_withoutCaption_isOk() throws Exception {
        Long vetId = firstVetId();
        MockMultipartFile file = new MockMultipartFile(
                "file", "no-caption.jpg", "image/jpeg",
                "X".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/v1/vets/{vetId}/album", vetId)
                        .file(file)
                        .with(staff()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.caption").doesNotExist());
    }

    @Test
    void uploadVetAlbumPhoto_unsupportedContentType_returns400() throws Exception {
        Long vetId = firstVetId();
        MockMultipartFile file = new MockMultipartFile(
                "file", "doc.txt", "text/plain",
                "not an image".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/v1/vets/{vetId}/album", vetId)
                        .file(file)
                        .with(staff()))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-PetClinic-Alert", "error.unsupported-media"));
    }

    @Test
    void uploadVetAlbumPhoto_vetNotFound_returns404() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "a.jpg", "image/jpeg",
                "X".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/v1/vets/{vetId}/album", 999_999L)
                        .file(file)
                        .with(staff()))
                .andExpect(status().isNotFound());
    }

    // ---------- DELETE ----------

    @Test
    void deleteVetAlbumPhoto_existing_returns204_thenListReducesCount() throws Exception {
        Long vetId = firstVetId();
        Long photoId = uploadAlbumPhoto(vetId, "ToDelete", "del.jpg", "image/jpeg");
        uploadAlbumPhoto(vetId, "Keep", "keep.jpg", "image/jpeg");

        mvc.perform(delete("/api/v1/vets/{vetId}/album/{photoId}", vetId, photoId).with(staff()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/vets/{vetId}/album", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void deleteVetAlbumPhoto_wrongVetId_returns404() throws Exception {
        Long vetA = firstVetId();
        Long vetB = secondVetId();
        Long photoId = uploadAlbumPhoto(vetA, "A", "a.jpg", "image/jpeg");

        mvc.perform(delete("/api/v1/vets/{vetId}/album/{photoId}", vetB, photoId).with(staff()))
                .andExpect(status().isNotFound());
    }

    // ---------- helpers ----------

    private Long firstVetId() throws Exception {
        return vetIdByIndex(0);
    }

    private Long secondVetId() throws Exception {
        return vetIdByIndex(1);
    }

    private Long vetIdByIndex(int idx) throws Exception {
        String body = mvc.perform(get("/api/v1/vets").param("active", "true").with(staff()))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(body).path("content").get(idx).path("id").asLong();
    }

    private Long uploadAlbumPhoto(Long vetId, String caption, String filename, String contentType)
            throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", filename, contentType,
                ("BYTES_" + filename).getBytes(StandardCharsets.UTF_8));
        String resp = mvc.perform(multipart("/api/v1/vets/{vetId}/album", vetId)
                        .file(file)
                        .param("caption", caption)
                        .with(staff()))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(resp).path("id").asLong();
    }
}
