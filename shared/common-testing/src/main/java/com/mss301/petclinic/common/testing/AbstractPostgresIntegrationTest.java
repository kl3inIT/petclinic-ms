package com.mss301.petclinic.common.testing;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Base class cho integration test cần Postgres thật.
 *
 * <p><b>Singleton container:</b> {@code static} field → cùng 1 container tái dùng cho mọi
 * test class trong JVM. Spring Boot caches ApplicationContext theo
 * config (dependsOn props/beans), nên khi nhiều test cùng kế thừa class này, Spring chỉ
 * khởi động Boot context 1 lần — Postgres khởi động 1 lần — test cycle nhanh hơn nhiều
 * so với 1 container per class.
 *
 * <p><b>{@link ServiceConnection}:</b> Spring Boot 3+ auto-wire {@code spring.datasource.*}
 * từ container — KHÔNG cần {@code @DynamicPropertySource} thủ công. Service-specific Liquibase
 * migration chạy normal lúc Spring context start.
 *
 * <p><b>pgvector image:</b> dùng cùng image với production compose để genai-service test có
 * vector extension. Service khác (customers/vets/visits) không touch vector → chỉ phí ~50MB image.
 *
 * <h4>Usage</h4>
 * <pre>{@code
 * @SpringBootTest
 * class MyIntegrationTest extends AbstractPostgresIntegrationTest {
 *     @Autowired private MyRepository repository;
 *     @Test void something() { ... }
 * }
 * }</pre>
 *
 * <p>Slice test (@DataJpaTest) tự auto-config DataSource từ container — không cần extends
 * class này, chỉ cần {@code @Testcontainers} + @Container field. Class này dành cho
 * full Boot context test.
 */
@Testcontainers
public abstract class AbstractPostgresIntegrationTest {

    /** Hardcoded image tag matching production compose để parity. */
    private static final DockerImageName POSTGRES_IMAGE =
            DockerImageName.parse("pgvector/pgvector:pg18").asCompatibleSubstituteFor("postgres");

    /**
     * Static container — Testcontainers JUnit 5 extension manage lifecycle. Container
     * khởi động khi class đầu tiên load, stop khi JVM exit (Ryuk cleanup).
     * {@code withReuse(true)}: nếu host config cho phép, container survive giữa các test JVM —
     * dev local cycle nhanh. CI bỏ qua reuse (mỗi run JVM mới).
     */
    @Container
    @ServiceConnection
    @SuppressWarnings("resource") // singleton, stop bởi Ryuk
    protected static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(POSTGRES_IMAGE)
            .withDatabaseName("petclinic_test")
            .withUsername("test")
            .withPassword("test")
            .withReuse(true);
}
