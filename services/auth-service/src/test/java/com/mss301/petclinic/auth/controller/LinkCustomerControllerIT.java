package com.mss301.petclinic.auth.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.mss301.petclinic.auth.model.User;
import com.mss301.petclinic.auth.repository.UserRepository;

/**
 * Phase L IT — admin link user account ↔ customer (owner) entity.
 *
 * <p>Cover 6 case:
 * <ul>
 *   <li>ADMIN link OK → 200 + response carry customerId</li>
 *   <li>ADMIN link duplicate customerId → 400 errorKey {@code customer-already-linked}
 *       (unique constraint {@code uk_users_customer_id})</li>
 *   <li>ADMIN link user not exists → 404</li>
 *   <li>STAFF role → 403 (RBAC YAML chỉ cho ADMIN)</li>
 *   <li>Anonymous → 401</li>
 *   <li>Body validation: customerId âm → 400</li>
 * </ul>
 *
 * <p>Setup: insert user trực tiếp qua {@link UserRepository} (bypass /register tránh side-effect
 * publish event). JWT mock với authority {@code ROLE_ADMIN} via Spring Security test helpers —
 * không cần JWKS thật.
 */
@SpringBootTest
@Testcontainers
@Transactional
class LinkCustomerControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18-alpine")
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

    /** Helper insert user thuần — không qua /register (tránh event publish side-effect). */
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
    void linkCustomer_adminValidRequest_returns200WithCustomerId() throws Exception {
        User user = insertUser("alice");

        mvc.perform(patch("/api/v1/users/{id}/customer-link", user.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\": 101}")
                        .with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId().toString()))
                .andExpect(jsonPath("$.customerId").value(101));
    }

    // ─── Conflict: customerId đã link user khác ─────────────────────────────────

    @Test
    void linkCustomer_duplicateCustomerId_returns400WithErrorKey() throws Exception {
        User userA = insertUser("alice");
        User userB = insertUser("bob");

        // Link customer 202 vào userA trước
        mvc.perform(patch("/api/v1/users/{id}/customer-link", userA.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\": 202}")
                        .with(admin()))
                .andExpect(status().isOk());

        // Link cùng customer 202 vào userB → vi phạm uk_users_customer_id
        mvc.perform(patch("/api/v1/users/{id}/customer-link", userB.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\": 202}")
                        .with(admin()))
                .andExpect(status().isBadRequest())
                // ExceptionTranslator (common-web) prefix "error." vào errorKey từ BadRequestAlertException
                .andExpect(header().string("X-PetClinic-Alert", "error.customer-already-linked"));
    }

    // ─── User not found ─────────────────────────────────────────────────────────

    @Test
    void linkCustomer_userNotFound_returns404() throws Exception {
        UUID nonExistent = UUID.randomUUID();
        mvc.perform(patch("/api/v1/users/{id}/customer-link", nonExistent)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\": 303}")
                        .with(admin()))
                .andExpect(status().isNotFound());
    }

    // ─── RBAC enforcement ──────────────────────────────────────────────────────

    @Test
    void linkCustomer_staffRole_returns403() throws Exception {
        User user = insertUser("alice");
        mvc.perform(patch("/api/v1/users/{id}/customer-link", user.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\": 404}")
                        .with(staff()))
                .andExpect(status().isForbidden());
    }

    @Test
    void linkCustomer_anonymous_returns401() throws Exception {
        User user = insertUser("alice");
        mvc.perform(patch("/api/v1/users/{id}/customer-link", user.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\": 505}"))
                .andExpect(status().isUnauthorized());
    }

    // ─── Validation ────────────────────────────────────────────────────────────

    @Test
    void linkCustomer_negativeCustomerId_returns400() throws Exception {
        User user = insertUser("alice");
        mvc.perform(patch("/api/v1/users/{id}/customer-link", user.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\": -1}")
                        .with(admin()))
                .andExpect(status().isBadRequest());
    }
}
