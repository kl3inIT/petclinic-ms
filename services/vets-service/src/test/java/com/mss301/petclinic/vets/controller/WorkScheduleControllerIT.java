package com.mss301.petclinic.vets.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Integration test cho WorkScheduleController — REST PUT-replace pattern.
 * Pattern theo VetControllerIT/EducationControllerIT (MockMvc + Testcontainers + Transactional).
 */
@SpringBootTest
@Testcontainers
@Transactional
class WorkScheduleControllerIT {

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
    void listVetWorkSchedule_emptyInitially_returnsEmptyArray() throws Exception {
        Long vetId = firstVetId();
        // Clear schedule to ensure we test the empty state reliably,
        // avoiding flaky behavior depending on which vet is returned first by DB.
        mvc.perform(delete("/api/v1/vets/{vetId}/work-schedule", vetId).with(staff()));

        mvc.perform(get("/api/v1/vets/{vetId}/work-schedule", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void listVetWorkSchedule_vetNotFound_returns404() throws Exception {
        mvc.perform(get("/api/v1/vets/{vetId}/work-schedule", 999_999L).with(staff()))
                .andExpect(status().isNotFound());
    }

    // ---------- PUT replace ----------

    @Test
    void replaceVetWorkSchedule_validMultipleSlots_returnsSortedList() throws Exception {
        Long vetId = firstVetId();
        // Cố tình gửi thứ tự ngẫu nhiên (FRIDAY 14h trước MONDAY 8h) — service phải sort response
        String body =
                """
                {
                  "slots": [
                    {"workday": "FRIDAY",  "workHour": "HOUR_14_15"},
                    {"workday": "MONDAY",  "workHour": "HOUR_8_9"},
                    {"workday": "MONDAY",  "workHour": "HOUR_9_10"}
                  ]
                }
                """;
        mvc.perform(put("/api/v1/vets/{vetId}/work-schedule", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                // Sort theo (workday Mon→Sun, workHour 8h→20h)
                .andExpect(jsonPath("$[0].workday").value("MONDAY"))
                .andExpect(jsonPath("$[0].workHour").value("HOUR_8_9"))
                .andExpect(jsonPath("$[1].workday").value("MONDAY"))
                .andExpect(jsonPath("$[1].workHour").value("HOUR_9_10"))
                .andExpect(jsonPath("$[2].workday").value("FRIDAY"))
                .andExpect(jsonPath("$[2].workHour").value("HOUR_14_15"));
    }

    @Test
    void replaceVetWorkSchedule_emptySlots_clearsAll() throws Exception {
        Long vetId = firstVetId();
        // Set trước 1 slot
        putSchedule(vetId, """
                { "slots": [{"workday": "MONDAY", "workHour": "HOUR_8_9"}] }
                """);
        // Sau đó replace với empty → clear all
        mvc.perform(put("/api/v1/vets/{vetId}/work-schedule", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slots\": []}")
                        .with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void replaceVetWorkSchedule_isReplaceNotMerge() throws Exception {
        Long vetId = firstVetId();
        // PUT lần 1: 2 slot
        putSchedule(vetId, """
                {
                  "slots": [
                    {"workday": "MONDAY", "workHour": "HOUR_8_9"},
                    {"workday": "TUESDAY", "workHour": "HOUR_8_9"}
                  ]
                }
                """);
        // PUT lần 2: chỉ 1 slot khác → MONDAY và TUESDAY cũ phải bị xoá, chỉ còn WEDNESDAY
        mvc.perform(put("/api/v1/vets/{vetId}/work-schedule", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "slots": [{"workday": "WEDNESDAY", "workHour": "HOUR_10_11"}] }
                                """)
                        .with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].workday").value("WEDNESDAY"));
    }

    @Test
    void replaceVetWorkSchedule_duplicateSlot_returns400() throws Exception {
        Long vetId = firstVetId();
        String body =
                """
                {
                  "slots": [
                    {"workday": "MONDAY", "workHour": "HOUR_8_9"},
                    {"workday": "MONDAY", "workHour": "HOUR_8_9"}
                  ]
                }
                """;
        mvc.perform(put("/api/v1/vets/{vetId}/work-schedule", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-PetClinic-Alert", "error.slot-duplicate"));
    }

    @Test
    void replaceVetWorkSchedule_invalidEnumValue_returns400() throws Exception {
        Long vetId = firstVetId();
        // "FOO" không phải Workday enum → Jackson HttpMessageNotReadable → 400 ProblemDetail
        String body =
                """
                { "slots": [{"workday": "FOO", "workHour": "HOUR_8_9"}] }
                """;
        mvc.perform(put("/api/v1/vets/{vetId}/work-schedule", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void replaceVetWorkSchedule_calledTwiceWithSameBody_isIdempotent() throws Exception {
        Long vetId = firstVetId();
        String body =
                """
                {
                  "slots": [
                    {"workday": "MONDAY", "workHour": "HOUR_8_9"},
                    {"workday": "TUESDAY", "workHour": "HOUR_9_10"}
                  ]
                }
                """;
        String first = putSchedule(vetId, body);
        String second = putSchedule(vetId, body);
        // Bytes giống nhau → idempotent thật sự (cả về data + ordering)
        org.junit.jupiter.api.Assertions.assertEquals(first, second);
    }

    @Test
    void replaceVetWorkSchedule_vetNotFound_returns404() throws Exception {
        mvc.perform(put("/api/v1/vets/{vetId}/work-schedule", 999_999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slots\": []}")
                        .with(staff()))
                .andExpect(status().isNotFound());
    }

    // ---------- CHECK availability (Phase H) ----------

    @Test
    void checkVetAvailability_slotExists_returnsAvailableTrue() throws Exception {
        Long vetId = firstVetId();
        putSchedule(vetId, """
                {
                  "slots": [
                    {"workday": "MONDAY", "workHour": "HOUR_9_10"}
                  ]
                }
                """);

        mvc.perform(get("/api/v1/vets/{vetId}/work-schedule/check", vetId)
                        .param("workday", "MONDAY")
                        .param("workHour", "HOUR_9_10")
                        .with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void checkVetAvailability_slotNotExists_returnsAvailableFalse() throws Exception {
        Long vetId = firstVetId();
        // Schedule chỉ có MONDAY 9h → check TUESDAY 14h phải false
        putSchedule(vetId, """
                {
                  "slots": [
                    {"workday": "MONDAY", "workHour": "HOUR_9_10"}
                  ]
                }
                """);

        mvc.perform(get("/api/v1/vets/{vetId}/work-schedule/check", vetId)
                        .param("workday", "TUESDAY")
                        .param("workHour", "HOUR_14_15")
                        .with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void checkVetAvailability_vetNotFound_returns404() throws Exception {
        mvc.perform(get("/api/v1/vets/{vetId}/work-schedule/check", 999_999L)
                        .param("workday", "MONDAY")
                        .param("workHour", "HOUR_9_10")
                        .with(staff()))
                .andExpect(status().isNotFound());
    }

    @Test
    void checkVetAvailability_invalidEnum_returns400() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(get("/api/v1/vets/{vetId}/work-schedule/check", vetId)
                        .param("workday", "INVALID_DAY")
                        .param("workHour", "HOUR_9_10")
                        .with(staff()))
                .andExpect(status().isBadRequest());
    }

    // ---------- DELETE clear ----------

    @Test
    void clearVetWorkSchedule_returns204_thenListEmpty() throws Exception {
        Long vetId = firstVetId();
        putSchedule(vetId, """
                {
                  "slots": [
                    {"workday": "MONDAY", "workHour": "HOUR_8_9"},
                    {"workday": "FRIDAY", "workHour": "HOUR_14_15"}
                  ]
                }
                """);

        mvc.perform(delete("/api/v1/vets/{vetId}/work-schedule", vetId).with(staff()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/vets/{vetId}/work-schedule", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ---------- helpers ----------

    private Long firstVetId() throws Exception {
        String body = mvc.perform(get("/api/v1/vets").param("active", "true").with(staff()))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(body).path("content").get(0).path("id").asLong();
    }

    private String putSchedule(Long vetId, String body) throws Exception {
        return mvc.perform(put("/api/v1/vets/{vetId}/work-schedule", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
    }
}
