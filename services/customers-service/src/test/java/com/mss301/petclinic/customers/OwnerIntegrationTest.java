package com.mss301.petclinic.customers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
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
}
