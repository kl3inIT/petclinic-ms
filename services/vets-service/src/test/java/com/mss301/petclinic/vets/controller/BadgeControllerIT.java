package com.mss301.petclinic.vets.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import java.time.LocalDate;

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
 * Integration test cho BadgeController.
 * Pattern theo VetControllerIT/EducationControllerIT (MockMvc + Testcontainers + Transactional).
 */
@SpringBootTest
@Testcontainers
@Transactional
class BadgeControllerIT {

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
    void listVetBadges_emptyInitially_returnsZero() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(get("/api/v1/vets/{vetId}/badges", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void listVetBadges_vetNotFound_returns404() throws Exception {
        mvc.perform(get("/api/v1/vets/{vetId}/badges", 999_999L).with(staff()))
                .andExpect(status().isNotFound());
    }

    @Test
    void listVetBadges_multipleBadges_returnsCorrectCount() throws Exception {
        Long vetId = firstVetId();
        addBadge(vetId, "ROOKIE", "2020-01-15");
        addBadge(vetId, "EXPERIENCED", "2025-06-01");

        mvc.perform(get("/api/v1/vets/{vetId}/badges", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    // ---------- CREATE ----------

    @Test
    void addVetBadge_validRequest_returns201WithLocation() throws Exception {
        Long vetId = firstVetId();
        String body =
                """
                {
                  "title": "SURGERY_EXPERT",
                  "awardedDate": "2024-03-15",
                  "description": "100 ca phẫu thuật thành công"
                }
                """;
        mvc.perform(post("/api/v1/vets/{vetId}/badges", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.vetId").value(vetId))
                .andExpect(jsonPath("$.title").value("SURGERY_EXPERT"))
                .andExpect(jsonPath("$.awardedDate").value("2024-03-15"));
    }

    @Test
    void addVetBadge_awardedDateInFuture_returns400() throws Exception {
        Long vetId = firstVetId();
        // Date xa tương lai để test luôn deterministic bất kể clock
        String futureDate = LocalDate.now().plusYears(10).toString();
        String body =
                """
                { "title": "ROOKIE", "awardedDate": "%s" }
                """.formatted(futureDate);
        mvc.perform(post("/api/v1/vets/{vetId}/badges", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-PetClinic-Alert", "error.date-future"));
    }

    @Test
    void addVetBadge_vetNotFound_returns404() throws Exception {
        mvc.perform(post("/api/v1/vets/{vetId}/badges", 999_999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\": \"ROOKIE\", \"awardedDate\": \"2020-01-01\"}")
                        .with(staff()))
                .andExpect(status().isNotFound());
    }

    @Test
    void addVetBadge_invalidEnumValue_returns400() throws Exception {
        Long vetId = firstVetId();
        String body =
                """
                { "title": "FOO_INVALID", "awardedDate": "2020-01-01" }
                """;
        mvc.perform(post("/api/v1/vets/{vetId}/badges", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addVetBadge_sameBadgeMultipleTimes_isAllowed() throws Exception {
        Long vetId = firstVetId();
        // Vd kỷ niệm 5 năm + 10 năm — cùng ROOKIE badge (giả sử) hoặc EXPERIENCED 2 lần
        addBadge(vetId, "EXPERIENCED", "2020-01-01");
        addBadge(vetId, "EXPERIENCED", "2025-01-01");

        mvc.perform(get("/api/v1/vets/{vetId}/badges", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    // ---------- DELETE ----------

    @Test
    void deleteVetBadge_existing_returns204_thenListReducesCount() throws Exception {
        Long vetId = firstVetId();
        Long badgeId = addBadge(vetId, "ROOKIE", "2020-01-15");
        addBadge(vetId, "MASTER", "2024-06-01");

        mvc.perform(delete("/api/v1/vets/{vetId}/badges/{bid}", vetId, badgeId).with(staff()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/vets/{vetId}/badges", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void deleteVetBadge_wrongVetId_returns404() throws Exception {
        Long vetA = firstVetId();
        Long vetB = secondVetId();
        Long badgeId = addBadge(vetA, "ROOKIE", "2020-01-15");

        // Delete badge của vetA nhưng path qua vetB → 404 (path-tamper, không leak)
        mvc.perform(delete("/api/v1/vets/{vetId}/badges/{bid}", vetB, badgeId).with(staff()))
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

    private Long addBadge(Long vetId, String title, String awardedDate) throws Exception {
        String body =
                """
                { "title": "%s", "awardedDate": "%s" }
                """.formatted(title, awardedDate);
        String resp = mvc.perform(post("/api/v1/vets/{vetId}/badges", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(resp).path("id").asLong();
    }
}
