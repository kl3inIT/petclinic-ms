package com.mss301.petclinic.customers;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
class CustomersServiceApplicationTests {

    /**
     * Postgres container chạy thật (Docker required).
     * {@code @ServiceConnection} tự inject jdbcUrl/user/pass vào Spring datasource —
     * không cần {@code @DynamicPropertySource}.
     * Liquibase chạy như production → test luôn validate cả schema migration.
     */
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("petclinic")
            .withUsername("postgres")
            .withPassword("postgres");

    @Test
    void contextLoads() {
        // Smoke test — Spring context khởi tạo + Liquibase chạy migration thành công.
    }
}
