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
 * Integration test cho RatingController + TopRatedVetsController.
 * Pattern theo VetControllerIT/EducationControllerIT (MockMvc + Testcontainers + Transactional).
 *
 * <p>Phase F: customerName lấy từ JWT claim "username" thay vì body. Helper {@code staff(name)}
 * inject claim. Test cũ {@code addVetRating_blankCustomerName_returns400} thay bằng
 * {@code addVetRating_jwtMissingUsername_returns400} cho semantic mới.</p>
 */
@SpringBootTest
@Testcontainers
@Transactional
class RatingControllerIT {

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

    /** Default staff JWT với claim username="test-user" (cho test không quan tâm identity). */
    private static RequestPostProcessor staff() {
        return staff("test-user");
    }

    /** Staff JWT với claim "username" custom — Phase F controller đọc claim này làm customerName. */
    private static RequestPostProcessor staff(String username) {
        return jwt().jwt(j -> j.claim("username", username))
                .authorities(new SimpleGrantedAuthority("ROLE_STAFF"));
    }

    /** Staff JWT KHÔNG có claim username — test fallback 400. */
    private static RequestPostProcessor staffNoUsername() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_STAFF"));
    }

    // ---------- CREATE ----------

    @Test
    void addVetRating_validRequest_returns201WithLocation() throws Exception {
        Long vetId = firstVetId();
        String body = """
                { "score": 5, "description": "Excellent vet!" }
                """;
        mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff("alice")))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.vetId").value(vetId))
                .andExpect(jsonPath("$.score").value(5))
                // customerName lấy TỪ JWT, không từ body — chứng minh không spoof được
                .andExpect(jsonPath("$.customerName").value("alice"))
                .andExpect(jsonPath("$.rateDate").exists());
    }

    @Test
    void addVetRating_bodyCustomerNameField_isSilentlyIgnored() throws Exception {
        // FE cũ vẫn gửi customerName="hacker" trong body — Jackson ignore (DTO không có field),
        // service lấy từ JWT → kết quả lưu đúng JWT principal, không phải body.
        Long vetId = firstVetId();
        String body = """
                { "score": 4, "customerName": "hacker", "description": "spoof attempt" }
                """;
        mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff("alice")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customerName").value("alice"));
    }

    @Test
    void addVetRating_scoreZero_returns400() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\": 0}")
                        .with(staff()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addVetRating_scoreSix_returns400() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\": 6}")
                        .with(staff()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addVetRating_jwtMissingUsername_returns400() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\": 3}")
                        .with(staffNoUsername()))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-PetClinic-Alert", "error.missing-username"));
    }

    @Test
    void addVetRating_vetNotFound_returns404() throws Exception {
        mvc.perform(post("/api/v1/vets/{vetId}/ratings", 999_999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\": 5}")
                        .with(staff("alice")))
                .andExpect(status().isNotFound());
    }

    @Test
    void addVetRating_sameCustomerTwice_upsertsInPlaceAndCountIsOne() throws Exception {
        Long vetId = firstVetId();

        // Lần 1: rate 5 sao
        String first = mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\": 5, \"description\": \"first\"}")
                        .with(staff("alice")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long firstId = om.readTree(first).path("id").asLong();

        // Lần 2: cùng alice rate lại vet đó với 2 sao → UPSERT, KHÔNG tạo row mới
        String second = mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\": 2, \"description\": \"changed my mind\"}")
                        .with(staff("alice")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value((int) firstId))   // cùng id → update không insert
                .andExpect(jsonPath("$.score").value(2))
                .andExpect(jsonPath("$.description").value("changed my mind"))
                .andReturn().getResponse().getContentAsString();

        // Summary chỉ count 1 — không bị spam
        mvc.perform(get("/api/v1/vets/{vetId}/ratings/summary", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.average").value(2.0));
    }

    // ---------- LIST + DELETE ----------

    @Test
    void listVetRatings_paginated() throws Exception {
        Long vetId = firstVetId();
        addRating(vetId, 5, "Bob");
        addRating(vetId, 4, "Carol");
        addRating(vetId, 3, "Dan");

        mvc.perform(get("/api/v1/vets/{vetId}/ratings", vetId)
                        .param("page", "0").param("size", "2")
                        .with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content.length()").value(2));
    }

    @Test
    void deleteVetRating_existing_returns204_thenSummaryReducesCount() throws Exception {
        Long vetId = firstVetId();
        Long ratingId = addRating(vetId, 5, "Bob");
        addRating(vetId, 3, "Carol");

        mvc.perform(delete("/api/v1/vets/{vetId}/ratings/{rid}", vetId, ratingId).with(staff()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/vets/{vetId}/ratings/summary", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    void deleteVetRating_wrongVetId_returns404() throws Exception {
        Long vetA = firstVetId();
        Long vetB = secondVetId();
        Long ratingId = addRating(vetA, 5, "Bob");

        // Delete rating của vetA nhưng path qua vetB → 404 path-tamper
        mvc.perform(delete("/api/v1/vets/{vetId}/ratings/{rid}", vetB, ratingId).with(staff()))
                .andExpect(status().isNotFound());
    }

    // ---------- SUMMARY ----------

    @Test
    void getVetRatingsSummary_noRatings_returnsZeroCountNullAverageAllZeroDistribution() throws Exception {
        Long vetId = firstVetId();
        mvc.perform(get("/api/v1/vets/{vetId}/ratings/summary", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0))
                .andExpect(jsonPath("$.average").doesNotExist())
                .andExpect(jsonPath("$.distribution.1").value(0))
                .andExpect(jsonPath("$.distribution.2").value(0))
                .andExpect(jsonPath("$.distribution.3").value(0))
                .andExpect(jsonPath("$.distribution.4").value(0))
                .andExpect(jsonPath("$.distribution.5").value(0));
    }

    @Test
    void getVetRatingsSummary_multipleRatings_returnsCorrectAggregates() throws Exception {
        Long vetId = firstVetId();
        addRating(vetId, 5, "A");
        addRating(vetId, 5, "B");
        addRating(vetId, 3, "C");

        mvc.perform(get("/api/v1/vets/{vetId}/ratings/summary", vetId).with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(3))
                .andExpect(jsonPath("$.average").value(org.hamcrest.Matchers.closeTo(4.333, 0.01)))
                .andExpect(jsonPath("$.distribution.5").value(2))
                .andExpect(jsonPath("$.distribution.3").value(1))
                .andExpect(jsonPath("$.distribution.4").value(0));
    }

    // ---------- TOP-RATED (cross-vet) ----------

    @Test
    void listTopRatedVets_noRatings_returnsEmptyArray() throws Exception {
        mvc.perform(get("/api/v1/vets/top-rated").with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void listTopRatedVets_ordersByAverageDescThenCountDesc() throws Exception {
        Long vetA = firstVetId();
        Long vetB = secondVetId();
        Long vetC = thirdVetId();

        addRating(vetA, 5, "x1");
        addRating(vetA, 5, "x2");
        addRating(vetA, 4, "x3");
        addRating(vetB, 5, "y1");
        addRating(vetB, 3, "y2");
        addRating(vetC, 3, "z1");
        addRating(vetC, 3, "z2");

        mvc.perform(get("/api/v1/vets/top-rated").with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].vetId").value(vetA))
                .andExpect(jsonPath("$[1].vetId").value(vetB))
                .andExpect(jsonPath("$[2].vetId").value(vetC));
    }

    @Test
    void listTopRatedVets_limitParamRespected() throws Exception {
        Long vetA = firstVetId();
        Long vetB = secondVetId();
        addRating(vetA, 5, "x1");
        addRating(vetB, 4, "y1");

        mvc.perform(get("/api/v1/vets/top-rated").param("limit", "1").with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].vetId").value(vetA));
    }

    @Test
    void listTopRatedVets_limitOutOfRange_returns400() throws Exception {
        mvc.perform(get("/api/v1/vets/top-rated").param("limit", "0").with(staff()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listTopRatedVets_sameAvgSameCount_tiebreakByVetIdAsc() throws Exception {
        // 3 vet có cùng AVG=5.0 và cùng COUNT=1 → tiebreak theo id ASC (vetA < vetB < vetC).
        // Nếu không có tertiary ORDER BY thì Postgres trả thứ tự không xác định.
        Long vetA = firstVetId();
        Long vetB = secondVetId();
        Long vetC = thirdVetId();

        addRating(vetA, 5, "alice");
        addRating(vetB, 5, "bob");
        addRating(vetC, 5, "carol");

        mvc.perform(get("/api/v1/vets/top-rated").param("limit", "3").with(staff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].vetId").value(vetA))
                .andExpect(jsonPath("$[1].vetId").value(vetB))
                .andExpect(jsonPath("$[2].vetId").value(vetC));
    }

    // ---------- helpers ----------

    private Long firstVetId() throws Exception {
        return vetIdByIndex(0);
    }

    private Long secondVetId() throws Exception {
        return vetIdByIndex(1);
    }

    private Long thirdVetId() throws Exception {
        return vetIdByIndex(2);
    }

    private Long vetIdByIndex(int idx) throws Exception {
        String body = mvc.perform(get("/api/v1/vets").param("active", "true").with(staff()))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(body).path("content").get(idx).path("id").asLong();
    }

    /**
     * customerName giờ là JWT claim, không phải body field. Inject qua staff(customerName).
     */
    private Long addRating(Long vetId, int score, String customerName) throws Exception {
        String body = "{ \"score\": %d }".formatted(score);
        String resp = mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(staff(customerName)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return om.readTree(resp).path("id").asLong();
    }
}
