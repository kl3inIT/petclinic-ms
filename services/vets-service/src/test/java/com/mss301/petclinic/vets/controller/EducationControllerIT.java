package com.mss301.petclinic.vets.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Integration test cho EducationController — sub-resource {@code /api/v1/vets/{vetId}/educations}.
 * Pattern theo VetControllerIT (MockMvc + Testcontainers + @Transactional rollback).
 */
@SpringBootTest
@Testcontainers
@Transactional
class EducationControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("petclinic")
            .withUsername("postgres")
            .withPassword("postgres");

    @Autowired
    WebApplicationContext wac;

    @Autowired
    ObjectMapper om;

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = webAppContextSetup(wac).apply(springSecurity()).build();
    }

    private static RequestPostProcessor staff() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_STAFF"));
    }

    // ---------- LIST ----------

    @Test
    void listVetEducations_emptyInitially_returnsZero() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(get("/api/v1/vets/{vetId}/educations", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void listVetEducations_vetNotFound_returns404() throws Exception {
        mvc.perform(get("/api/v1/vets/{vetId}/educations", 999_999L).with(staff()))
                .andExpect(status().isNotFound());
    }

    // ---------- CREATE ----------

    @Test
    void addVetEducation_validRequest_returns201WithLocationHeader() throws Exception {
        Long vetId = firstVetId();
        String body =
                """
                {
                  "schoolName": "Hanoi University of Agriculture",
                  "degree": "DVM",
                  "fieldOfStudy": "Veterinary Medicine",
                  "startDate": "2015-09-01",
                  "endDate": "2020-06-30"
                }
                """;
        mvc.perform(post("/api/v1/vets/{vetId}/educations", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isCreated())
                // Location header point đến resource vừa tạo — REST chuẩn cho 201
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.vetId").value(vetId))
                .andExpect(jsonPath("$.schoolName").value("Hanoi University of Agriculture"))
                .andExpect(jsonPath("$.degree").value("DVM"));
    }

    @Test
    void addVetEducation_endDateNull_returns201_ongoingStudy() throws Exception {
        Long vetId = firstVetId();
        String body =
                """
                {
                  "schoolName": "Royal Vet College",
                  "degree": "PhD",
                  "startDate": "2024-09-01"
                }
                """;
        mvc.perform(post("/api/v1/vets/{vetId}/educations", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.endDate").doesNotExist());
    }

    @Test
    void addVetEducation_vetNotFound_returns404() throws Exception {
        String body =
                """
                { "schoolName": "X", "degree": "Y", "startDate": "2020-01-01" }
                """;
        mvc.perform(post("/api/v1/vets/{vetId}/educations", 999_999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isNotFound());
    }

    @Test
    void addVetEducation_endDateBeforeStartDate_returns400() throws Exception {
        Long vetId = firstVetId();
        String body =
                """
                {
                  "schoolName": "X",
                  "degree": "Y",
                  "startDate": "2020-06-01",
                  "endDate": "2019-01-01"
                }
                """;
        mvc.perform(post("/api/v1/vets/{vetId}/educations", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-PetClinic-Alert", "error.date-invalid"));
    }

    // ---------- GET ----------

    @Test
    void getVetEducation_wrongVetId_returns404_noLeak() throws Exception {
        Long vetA = firstVetId();
        Long vetB = secondVetId();
        Long eduId = createEducation(vetA, "School A", "Degree A", "2010-01-01", "2014-01-01");

        // GET education của vetA nhưng query qua vetB → 404 (không leak existence)
        mvc.perform(get("/api/v1/vets/{vetId}/educations/{eduId}", vetB, eduId).with(staff()))
                .andExpect(status().isNotFound());
    }

    // ---------- PATCH ----------

    @Test
    void updateVetEducation_schoolNameOnly_otherFieldsUnchanged() throws Exception {
        Long vetId = firstVetId();
        Long eduId = createEducation(vetId, "Original School", "DVM", "2015-09-01", "2020-06-30");

        mvc.perform(patch("/api/v1/vets/{vetId}/educations/{eduId}", vetId, eduId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"schoolName\": \"New School\"}")
                        .with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schoolName").value("New School"))
                .andExpect(jsonPath("$.degree").value("DVM"))
                .andExpect(jsonPath("$.startDate").value("2015-09-01"))
                .andExpect(jsonPath("$.endDate").value("2020-06-30"));
    }

    @Test
    void updateVetEducation_patchStartDateAfterCurrentEndDate_returns400() throws Exception {
        Long vetId = firstVetId();
        Long eduId = createEducation(vetId, "School", "DVM", "2015-09-01", "2020-06-30");

        // PATCH startDate → 2021-01-01 sẽ làm endDate (2020-06-30) < startDate mới → 400
        mvc.perform(patch("/api/v1/vets/{vetId}/educations/{eduId}", vetId, eduId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startDate\": \"2021-01-01\"}")
                        .with(staff()))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-PetClinic-Alert", "error.date-invalid"));
    }

    // ---------- DELETE ----------

    @Test
    void deleteVetEducation_existing_returns204_thenGetReturns404() throws Exception {
        Long vetId = firstVetId();
        Long eduId = createEducation(vetId, "ToDelete", "X", "2010-01-01", null);

        mvc.perform(delete("/api/v1/vets/{vetId}/educations/{eduId}", vetId, eduId).with(staff()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/vets/{vetId}/educations/{eduId}", vetId, eduId).with(staff()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteVetEducation_notFound_returns404() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(delete("/api/v1/vets/{vetId}/educations/{eduId}", vetId, 999_999L).with(staff()))
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

    private Long secondVetId() throws Exception {
        String body = mvc.perform(get("/api/v1/vets").param("active", "true").with(staff()))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(body).path("content").get(1).path("id").asLong();
    }

    /**
     * @param endDate {@code null} = đang học (omit khỏi JSON body).
     */
    private Long createEducation(Long vetId, String schoolName, String degree, String startDate, String endDate)
            throws Exception {
        String body = endDate == null
                ? """
                  { "schoolName": "%s", "degree": "%s", "startDate": "%s" }
                  """.formatted(schoolName, degree, startDate)
                : """
                  { "schoolName": "%s", "degree": "%s", "startDate": "%s", "endDate": "%s" }
                  """.formatted(schoolName, degree, startDate, endDate);
        String respBody = mvc.perform(post("/api/v1/vets/{vetId}/educations", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(respBody).path("id").asLong();
    }
}
