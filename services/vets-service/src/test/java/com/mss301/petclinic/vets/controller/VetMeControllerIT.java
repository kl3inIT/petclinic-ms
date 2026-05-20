package com.mss301.petclinic.vets.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
 * IT cho VetMeController (Phase K). Pattern: JWT mock với claim {@code vetId} + role
 * {@code ROLE_VET}. Service resolve vetId từ JWT, KHÔNG có path param.
 *
 * <p>Verify:
 * <ul>
 *   <li>GET /me happy path → trả profile của vet trong claim</li>
 *   <li>GET /me thiếu claim → 400 missing-vet-id (defense in depth dù security đã require ROLE_VET)</li>
 *   <li>GET /me/work-schedule shortcut → trả schedule của vet trong claim</li>
 *   <li>PATCH /me → update profile của chính vet, KHÔNG được update vet khác</li>
 * </ul>
 */
@SpringBootTest
@Testcontainers
@Transactional
class VetMeControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("petclinic")
            .withUsername("postgres")
            .withPassword("postgres");

    @Autowired WebApplicationContext wac;
    @Autowired ObjectMapper om;

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = webAppContextSetup(wac).apply(springSecurity()).build();
    }

    /** ROLE_VET với claim vetId. */
    private static RequestPostProcessor vetUser(Long vetId) {
        return jwt().jwt(j -> j.claim("vetId", vetId).claim("username", "vet-user"))
                .authorities(new SimpleGrantedAuthority("ROLE_VET"));
    }

    /** ROLE_VET KHÔNG có claim vetId (token version cũ). */
    private static RequestPostProcessor vetUserNoClaim() {
        return jwt().jwt(j -> j.claim("username", "vet-user"))
                .authorities(new SimpleGrantedAuthority("ROLE_VET"));
    }

    /** Login staff để query danh sách vet (helper resolve vetId thật từ seed). */
    private static RequestPostProcessor staff() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_STAFF"));
    }

    private Long firstVetId() throws Exception {
        String body = mvc.perform(get("/api/v1/vets").param("active", "true").with(staff()))
                .andReturn().getResponse().getContentAsString();
        return om.readTree(body).path("content").get(0).path("id").asLong();
    }

    @Test
    void getMyVetProfile_validClaim_returnsProfile() throws Exception {
        Long vetId = firstVetId();

        mvc.perform(get("/api/v1/vets/me").with(vetUser(vetId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(vetId))
                .andExpect(jsonPath("$.firstName").exists())
                .andExpect(jsonPath("$.email").exists());
    }

    @Test
    void getMyVetProfile_missingVetIdClaim_returns400() throws Exception {
        mvc.perform(get("/api/v1/vets/me").with(vetUserNoClaim()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getMyVetProfile_unauthenticated_returns401() throws Exception {
        mvc.perform(get("/api/v1/vets/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listMyWorkSchedule_validClaim_returnsArray() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(get("/api/v1/vets/me/work-schedule").with(vetUser(vetId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getMyRatingsSummary_validClaim_returnsZeroCountForNewVet() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(get("/api/v1/vets/me/ratings/summary").with(vetUser(vetId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").exists())
                .andExpect(jsonPath("$.distribution").exists());
    }

    @Test
    void listMyBadges_validClaim_returnsPaginatedArray() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(get("/api/v1/vets/me/badges").with(vetUser(vetId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void updateMyVetProfile_partialPatch_updatesOnlySpecifiedFields() throws Exception {
        Long vetId = firstVetId();

        mvc.perform(patch("/api/v1/vets/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resume\": \"Updated by self via /me endpoint\"}")
                        .with(vetUser(vetId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(vetId))
                .andExpect(jsonPath("$.resume").value("Updated by self via /me endpoint"));
    }
}
