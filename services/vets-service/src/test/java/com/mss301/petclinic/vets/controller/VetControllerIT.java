package com.mss301.petclinic.vets.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
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
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Integration test cho Phase A nghiệp vụ mới của vets-service:
 *
 * <ul>
 *   <li>Filter {@code ?active=}</li>
 *   <li>Email duplicate → 400 errorKey {@code email-exists}</li>
 *   <li>PATCH partial — field non-gửi giữ nguyên</li>
 *   <li>PATCH email blank → 400 errorKey {@code email-blank}</li>
 *   <li>PATCH active=false → vet hiện trong filter active=false</li>
 * </ul>
 *
 * <p>Security: mock JWT với authority ROLE_STAFF trực tiếp qua
 * {@link org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors#jwt()},
 * bypass {@code JwtAuthenticationConverter} → không cần JWKS thật.</p>
 *
 * <p>State: {@code @Transactional} trên class → mỗi test rollback, không leak.
 * MockMvc dispatch cùng thread nên service-layer {@code @Transactional} join outer tx.</p>
 *
 * <p>Setup: Spring Boot 4 đã loại bỏ {@code @AutoConfigureMockMvc} khỏi
 * spring-boot-test-autoconfigure → setup MockMvc thủ công qua {@code webAppContextSetup}
 * + {@code springSecurity()} configurer.</p>
 */
@SpringBootTest
@Testcontainers
@Transactional
class VetControllerIT {

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

    // ---------- Filter active ----------

    @Test
    void listVets_filterActiveFalse_returnsEmpty_whenAllSeedActive() throws Exception {
        mvc.perform(get("/api/v1/vets").param("active", "false").with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void listVets_filterActiveTrue_returnsAllSeed() throws Exception {
        mvc.perform(get("/api/v1/vets").param("active", "true").with(staff()))
                .andExpect(status().isOk())
                // Seed: 5 vet, tất cả active=true (changeset 006). Test không tạo thêm vet
                // trước assert → giữ con số ổn định bất chấp test khác chạy trước (mỗi test rollback).
                .andExpect(jsonPath("$.totalElements").value(5));
    }

    // ---------- Email unique ----------

    @Test
    void createVet_duplicateEmail_returns400WithEmailExistsKey() throws Exception {
        // Email 'thanh.nguyen@petclinic.local' đã seed (006).
        String body =
                """
                {
                  "firstName": "Duplicate",
                  "lastName": "Tester",
                  "email": "thanh.nguyen@petclinic.local"
                }
                """;
        mvc.perform(post("/api/v1/vets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isBadRequest())
                // BadRequestAlertException ship X-PetClinic-Alert header với errorKey để FE i18n toast.
                // ExceptionTranslator (shared/common-web) prefix "error." vào errorKey.
                .andExpect(header().string("X-PetClinic-Alert", "error.email-exists"));
    }

    @Test
    void createVet_validRequest_returns201WithBody() throws Exception {
        String body =
                """
                {
                  "firstName": "Linh",
                  "lastName": "Đỗ",
                  "email": "linh.do@petclinic.local",
                  "phoneNumber": "0911000099"
                }
                """;
        mvc.perform(post("/api/v1/vets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.email").value("linh.do@petclinic.local"))
                .andExpect(jsonPath("$.active").value(true));
    }

    // ---------- vetBillId (Item 4) ----------

    @Test
    void createVet_withVetBillId_returnsItAndReverseLookupWorks() throws Exception {
        String body =
                """
                {
                  "firstName": "Bill",
                  "lastName": "Linked",
                  "email": "bill.linked@petclinic.local",
                  "vetBillId": "BILL-XYZ-001"
                }
                """;
        String resp = mvc.perform(post("/api/v1/vets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.vetBillId").value("BILL-XYZ-001"))
                .andReturn().getResponse().getContentAsString();
        Long id = om.readTree(resp).path("id").asLong();

        // Tra cứu ngược theo vetBillId
        mvc.perform(get("/api/v1/vets/by-bill/{billId}", "BILL-XYZ-001").with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.vetBillId").value("BILL-XYZ-001"));
    }

    @Test
    void getVetByBillId_notFound_returns404() throws Exception {
        mvc.perform(get("/api/v1/vets/by-bill/{billId}", "NO-SUCH-BILL").with(staff()))
                .andExpect(status().isNotFound());
    }

    @Test
    void createVet_duplicateVetBillId_returns400() throws Exception {
        String first =
                """
                { "firstName": "A", "lastName": "One", "email": "a.one@petclinic.local", "vetBillId": "DUP-001" }
                """;
        mvc.perform(post("/api/v1/vets")
                        .contentType(MediaType.APPLICATION_JSON).content(first).with(staff()))
                .andExpect(status().isCreated());

        String second =
                """
                { "firstName": "B", "lastName": "Two", "email": "b.two@petclinic.local", "vetBillId": "DUP-001" }
                """;
        mvc.perform(post("/api/v1/vets")
                        .contentType(MediaType.APPLICATION_JSON).content(second).with(staff()))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-PetClinic-Alert", "error.vetBillId-exists"));
    }

    // ---------- Auto-badge khi tạo vet (Item 5) ----------

    @Test
    void createVet_autoAssignsRookieBadge() throws Exception {
        String body =
                """
                { "firstName": "New", "lastName": "Doctor", "email": "new.doctor@petclinic.local" }
                """;
        String resp = mvc.perform(post("/api/v1/vets")
                        .contentType(MediaType.APPLICATION_JSON).content(body).with(staff()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long id = om.readTree(resp).path("id").asLong();

        mvc.perform(get("/api/v1/vets/{vetId}/badges", id).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value("ROOKIE"));
    }

    // ---------- PATCH partial ----------

    @Test
    void patchVet_emailOnly_otherFieldsUnchanged() throws Exception {
        // Lấy vet đầu tiên — query trước để có id thật + firstName/lastName, không hard-code.
        String listBody = mvc.perform(get("/api/v1/vets").param("active", "true").with(staff()))
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long firstId = om.readTree(listBody).path("content").get(0).path("id").asLong();
        String firstFirstName = om.readTree(listBody).path("content").get(0).path("firstName").asText();
        String firstLastName = om.readTree(listBody).path("content").get(0).path("lastName").asText();

        String patchBody =
                """
                { "email": "renamed@petclinic.local" }
                """;
        mvc.perform(patch("/api/v1/vets/{id}", firstId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patchBody)
                        .with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("renamed@petclinic.local"))
                .andExpect(jsonPath("$.firstName").value(firstFirstName))
                .andExpect(jsonPath("$.lastName").value(firstLastName))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void patchVet_emailBlank_returns400WithEmailBlankKey() throws Exception {
        Long firstId = firstVetId();
        String patchBody =
                """
                { "email": "  " }
                """;
        mvc.perform(patch("/api/v1/vets/{id}", firstId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patchBody)
                        .with(staff()))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-PetClinic-Alert", "error.email-blank"));
    }

    // ---------- Soft-deactivate ----------

    @Test
    void patchVet_deactivate_thenAppearsInActiveFalseFilter() throws Exception {
        Long firstId = firstVetId();

        mvc.perform(patch("/api/v1/vets/{id}", firstId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\": false}")
                        .with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mvc.perform(get("/api/v1/vets").param("active", "false").with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(firstId))
                .andExpect(jsonPath("$.content[0].active").value(false));
    }

    // ---------- helper ----------

    private Long firstVetId() throws Exception {
        String listBody = mvc.perform(get("/api/v1/vets").param("active", "true").with(staff()))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(listBody).path("content").get(0).path("id").asLong();
    }
}
