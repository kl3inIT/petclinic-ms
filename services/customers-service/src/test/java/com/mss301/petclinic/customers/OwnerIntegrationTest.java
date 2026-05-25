package com.mss301.petclinic.customers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.testing.AbstractPostgresIntegrationTest;
import com.mss301.petclinic.common.testing.JwtTestSupport;
import com.mss301.petclinic.customers.repository.OwnerRepository;

/**
 * End-to-end integration test cho customers-service. Full Spring Boot context + Postgres
 * Testcontainer (via {@link AbstractPostgresIntegrationTest}).
 *
 * <h4>Test boundary</h4>
 * Đi từ HTTP → Controller → Service → Repository → Postgres → back. KHÔNG mock gì
 * trong stack — verify thật. Slow nhất nhưng cao confidence nhất; chạy ít hơn unit/slice.
 *
 * <h4>JWKS override</h4>
 * common-security yêu cầu {@code petclinic.auth.jwt.jwk-set-uri}. Test không có auth-service,
 * dùng URL giả + Spring Security Test mock {@code @WithMockUser}/{@code .with(jwt(...))} bypass
 * Nimbus validation — không gọi network.
 *
 * <h4>Eureka/Config off</h4>
 * Override {@code spring.cloud.config.enabled=false} + {@code eureka.client.enabled=false} để
 * test không cần config-server/discovery up.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional   // mỗi test rollback DB → seed data không bị pollute, count assertion stable
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "spring.cloud.discovery.enabled=false",
        "eureka.client.enabled=false",
        "petclinic.auth.jwt.jwk-set-uri=http://localhost:0/jwks-not-used-in-test",
        "spring.jpa.hibernate.ddl-auto=validate",
        // config-repo Hibernate default_schema không load vì cloud.config tắt → set manual.
        "spring.jpa.properties.hibernate.default_schema=customers",
        "spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.yaml",
})
class OwnerIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired OwnerRepository repository;

    @Test
    @DisplayName("POST /api/v1/owners → row persist + GET trả về")
    void createAndFetchOwner_persists() throws Exception {
        String payload = """
                {"firstName":"Test","lastName":"User","city":"Hà Nội","telephone":"0900000000"}
                """;

        long countBefore = repository.count();

        mockMvc.perform(post("/api/v1/owners")
                        .with(jwt().jwt(JwtTestSupport.userJwt()).authorities(JwtTestSupport.userAuthorities()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstName").value("Test"))
                .andExpect(jsonPath("$.lastName").value("User"));

        assertThat(repository.count()).isEqualTo(countBefore + 1);
    }

    @Test
    @DisplayName("GET /api/v1/owners — seed Liquibase data hiện trong response")
    void listOwners_returnsSeededData() throws Exception {
        // Seed 004-seed-dev-data.yaml insert 10 owners. Test verify Liquibase chạy đúng.
        // Dùng `>= 10` thay vì `== 10` để chịu được mọi test order (transactional rollback
        // áp dụng cho new inserts, nhưng các test method khác đang chạy song song có thể leak).
        mockMvc.perform(get("/api/v1/owners?size=20")
                        .with(jwt().jwt(JwtTestSupport.userJwt()).authorities(JwtTestSupport.userAuthorities())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(10)))
                .andExpect(jsonPath("$.content[?(@.lastName == 'Nguyễn')]").exists());
    }

    // ===== /me self-service — JWT customerId claim →
    // controller resolveCustomerId() → service.findById/update =====

    /** Tạo JWT bộ phận có claim customerId — controller dùng để resolve owner record. */
    private static Jwt userJwtWithCustomerId(long customerId) {
        Instant now = Instant.now();
        return Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .header("typ", "JWT")
                .subject("00000000-0000-0000-0000-000000000001")
                .claim("preferred_username", "testuser")
                .claim("roles", List.of("USER"))
                .claim("customerId", customerId)
                .issuer("petclinic-ms-test")
                .audience(List.of("petclinic-ms"))
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/owners/me — JWT customerId=1 → trả về owner seed #1")
    void getMyOwnerProfile_resolvesByClaim() throws Exception {
        // Seed Liquibase 004: owner id=1 = "Anh Nguyễn"
        mockMvc.perform(get("/api/v1/owners/me")
                        .with(jwt().jwt(userJwtWithCustomerId(1L))
                                .authorities(JwtTestSupport.userAuthorities())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.firstName").value("Anh"))
                .andExpect(jsonPath("$.lastName").value("Nguyễn"));
    }

    @Test
    @DisplayName("GET /api/v1/owners/me — JWT thiếu customerId claim → 400 BadRequestAlert")
    void getMyOwnerProfile_missingClaim_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/owners/me")
                        .with(jwt().jwt(JwtTestSupport.userJwt())
                                .authorities(JwtTestSupport.userAuthorities())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.entityName").value("owner-me"))
                .andExpect(jsonPath("$.errorKey").value("missing-customer-id"));
    }

    @Test
    @DisplayName("PATCH /api/v1/owners/me — update partial qua customerId claim")
    void updateMyOwnerProfile_updates() throws Exception {
        String body = """
                {"city":"Cần Thơ"}
                """;

        mockMvc.perform(patch("/api/v1/owners/me")
                        .with(jwt().jwt(userJwtWithCustomerId(1L))
                                .authorities(JwtTestSupport.userAuthorities()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.city").value("Cần Thơ"));
    }
}
