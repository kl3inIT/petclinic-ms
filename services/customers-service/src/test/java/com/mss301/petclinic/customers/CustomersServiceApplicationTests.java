package com.mss301.petclinic.customers;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import com.mss301.petclinic.common.testing.AbstractPostgresIntegrationTest;

/**
 * Smoke test — verify Spring context khởi tạo + Liquibase chạy migration.
 *
 * Tái dùng {@link AbstractPostgresIntegrationTest} (singleton Postgres container) thay vì
 * tự khai báo @Container per-class → context cache share giữa các test class.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "spring.cloud.discovery.enabled=false",
        "eureka.client.enabled=false",
        "petclinic.auth.jwt.jwk-set-uri=http://localhost:0/jwks-not-used-in-test",
        "spring.jpa.properties.hibernate.default_schema=customers",
        "spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.yaml",
})
class CustomersServiceApplicationTests extends AbstractPostgresIntegrationTest {

    @Test
    void contextLoads() {
        // Boot context + Liquibase migration + Hibernate validate đều OK nếu test pass.
    }
}
