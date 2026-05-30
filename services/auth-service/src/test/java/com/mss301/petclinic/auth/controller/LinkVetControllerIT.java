package com.mss301.petclinic.auth.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.mss301.petclinic.auth.model.User;
import com.mss301.petclinic.auth.repository.UserRepository;

/**
 * Phase K IT — admin link user account ↔ vet entity của vets-service.
 *
 * <p>Cover 6 case mirror {@link LinkCustomerControllerIT}:
 * <ul>
 *   <li>ADMIN link OK → 200 + response carry vetId</li>
 *   <li>ADMIN re-link cùng vetId (KHÔNG unique constraint) → 200 (overwrite)</li>
 *   <li>ADMIN link user not exists → 404</li>
 *   <li>STAFF role → 403</li>
 *   <li>Anonymous → 401</li>
 *   <li>Body validation: vetId âm → 400</li>
 * </ul>
 *
 * <p>Phase K KHÔNG có unique constraint trên {@code users.vet_id} — 1 vet về lý
 * thuyết có thể link nhiều account dev (admin có thể quản lý cùng vet). Test thứ
 * 2 verify behavior này (KHÔNG kỳ vọng 400 conflict).
 */
@SpringBootTest
@Testcontainers
@Transactional
class LinkVetControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("petclinic")
            .withUsername("postgres")
            .withPassword("postgres");

    @Autowired
    WebApplicationContext wac;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = webAppContextSetup(wac).apply(springSecurity()).build();
    }

    private static RequestPostProcessor admin() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private static RequestPostProcessor staff() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_STAFF"));
    }

    private User insertUser(String username) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(username + "@petclinic.local");
        u.setPassword(passwordEncoder.encode("password123"));
        Set<String> roles = new HashSet<>();
        roles.add("USER");
        u.setRoles(roles);
        u.setEnabled(true);
        return userRepository.saveAndFlush(u);
    }

    // ─── Happy path ─────────────────────────────────────────────────────────────

    @Test
    void linkVet_adminValidRequest_returns200WithVetId() throws Exception {
        User user = insertUser("vet-candidate");

        mvc.perform(patch("/api/v1/users/{id}/vet-link", user.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vetId\": 1}")
                        .with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId().toString()))
                .andExpect(jsonPath("$.vetId").value(1));
    }

    // ─── Re-link cùng vetId → overwrite, KHÔNG conflict ────────────────────────

    @Test
    void linkVet_relinkSameVetId_returns200() throws Exception {
        User userA = insertUser("vet-candidate-a");
        User userB = insertUser("vet-candidate-b");

        mvc.perform(patch("/api/v1/users/{id}/vet-link", userA.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vetId\": 7}")
                        .with(admin()))
                .andExpect(status().isOk());

        // userB cùng vetId — KHÔNG có unique constraint nên OK
        mvc.perform(patch("/api/v1/users/{id}/vet-link", userB.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vetId\": 7}")
                        .with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vetId").value(7));
    }

    // ─── User not found ─────────────────────────────────────────────────────────

    @Test
    void linkVet_userNotFound_returns404() throws Exception {
        UUID nonExistent = UUID.randomUUID();
        mvc.perform(patch("/api/v1/users/{id}/vet-link", nonExistent)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vetId\": 9}")
                        .with(admin()))
                .andExpect(status().isNotFound());
    }

    // ─── RBAC enforcement ──────────────────────────────────────────────────────

    @Test
    void linkVet_staffRole_returns403() throws Exception {
        User user = insertUser("vet-candidate");
        mvc.perform(patch("/api/v1/users/{id}/vet-link", user.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vetId\": 1}")
                        .with(staff()))
                .andExpect(status().isForbidden());
    }

    @Test
    void linkVet_anonymous_returns401() throws Exception {
        User user = insertUser("vet-candidate");
        mvc.perform(patch("/api/v1/users/{id}/vet-link", user.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vetId\": 1}"))
                .andExpect(status().isUnauthorized());
    }

    // ─── Validation ────────────────────────────────────────────────────────────

    @Test
    void linkVet_negativeVetId_returns400() throws Exception {
        User user = insertUser("vet-candidate");
        mvc.perform(patch("/api/v1/users/{id}/vet-link", user.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vetId\": -1}")
                        .with(admin()))
                .andExpect(status().isBadRequest());
    }
}
