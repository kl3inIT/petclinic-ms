package com.mss301.petclinic.vets.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import java.net.URI;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mss301.petclinic.vets.client.FilesClient;

@SpringBootTest
@Testcontainers
@Transactional
class VetPhotoControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("petclinic")
            .withUsername("postgres")
            .withPassword("postgres");

    @Autowired
    WebApplicationContext wac;

    @Autowired
    ObjectMapper om;

    @MockitoBean
    FilesClient filesClient;

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = webAppContextSetup(wac).apply(springSecurity()).build();
        reset(filesClient);
        when(filesClient.maxFileSizeBytes()).thenReturn(10_485_760L);
        when(filesClient.presignedUrl(anyString()))
                .thenAnswer(inv -> URI.create("http://files.test/" + inv.getArgument(0, String.class)).toURL());
    }

    private static RequestPostProcessor staff() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_STAFF"));
    }

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

        mvc.perform(get("/api/v1/vets/{vetId}/photo", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.sizeBytes").value(9));
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
