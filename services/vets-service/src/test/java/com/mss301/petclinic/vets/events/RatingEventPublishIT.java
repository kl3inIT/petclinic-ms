package com.mss301.petclinic.vets.events;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * IT verify Phase G — publish {@code vet.rating.added} event sau khi POST rating thành công.
 *
 * <p>Setup khác với các IT khác: override {@code petclinic.events.enabled=true} để autoconfig
 * khởi tạo EventPublisher (mặc định test profile = false trong test/resources/application.yml).
 * RabbitMQ chạy qua Testcontainers (artifactId {@code testcontainers-rabbitmq}, gotcha #4 CLAUDE.md).
 *
 * <p>Verify 3 case:
 * <ol>
 *   <li>POST rating mới (INSERT) → event publish với {@code updated=false}, đầy đủ payload field</li>
 *   <li>POST rating cùng customer + vet (UPSERT update) → event publish với {@code updated=true}</li>
 *   <li>(Optional) afterCommit semantic — nếu transaction rollback, event KHÔNG fire.
 *       Hiện skip vì cần inject failure point — đủ tin tưởng qua code review của
 *       TransactionSynchronizationManager.registerSynchronization.</li>
 * </ol>
 */
// KHÔNG dùng @Transactional ở class level: test transaction rollback → afterCommit hook
// trong RatingServiceImpl.publishRatingAddedAfterCommit() KHÔNG fire → event không publish
// → assertion fail "Phải nhận được vet.rating.added message trong 5s". CodeRabbit review
// (PR #11, 2026-05-20) phát hiện. Data isolation giữa các test handle qua explicit cleanup
// trong @BeforeEach (ratingRepository.deleteAll).
@SpringBootTest
@Testcontainers
@TestPropertySource(properties = {
        "petclinic.events.enabled=true",
        // Test queue riêng để consume event verify — khác queue prod ("vets.rating.added" etc.)
        "test.rabbit.queue=vets.test.rating.added"
})
class RatingEventPublishIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("petclinic")
            .withUsername("postgres")
            .withPassword("postgres");

    // RabbitMQContainer mặc định wait theo port open, không guarantee broker đã accept
    // AMQP connection. CI Linux runner load cao → first connection fail với
    // ShutdownSignalException khi declareQueue ở @BeforeEach. Wait theo log "Server startup
    // complete" để chắc broker ready trước khi Spring AMQP connect.
    @Container
    @ServiceConnection
    static RabbitMQContainer rabbit = new RabbitMQContainer("rabbitmq:4-management")
            .waitingFor(Wait.forLogMessage(".*Server startup complete.*", 1));

    /**
     * Bind test queue vào exchange `petclinic.events` với routing key `vet.rating.added`
     * SAU khi container start, TRƯỚC khi context load. @DynamicPropertySource chạy đầu
     * spring lifecycle nên không thể declare queue qua Spring AMQP — đành dùng raw HTTP API
     * hoặc gọi Java AMQP client. Đơn giản hơn: declare ở @BeforeAll sau khi context load.
     */
    @DynamicPropertySource
    static void overrideExchange(DynamicPropertyRegistry registry) {
        // Đảm bảo exchange name predictable cho test
        registry.add("petclinic.events.exchange", () -> "petclinic.events");
    }

    @Autowired WebApplicationContext wac;
    @Autowired ObjectMapper om;
    @Autowired RabbitTemplate rabbitTemplate;
    @Autowired RabbitAdmin rabbitAdmin;
    @Autowired com.mss301.petclinic.vets.repository.RatingRepository ratingRepository;

    static final String TEST_QUEUE = "vets.test.rating.added";

    MockMvc mvc;

    @BeforeAll
    static void awaitBrokerReady() {
        // Wait.forLogMessage trên RabbitMQContainer đã đảm bảo broker accept TCP, nhưng
        // RabbitMQ broker đôi khi còn boot vhost/exchange metadata sau khi log "Server
        // startup complete". Sleep ngắn để tránh first AMQP RPC fail với
        // ShutdownSignalException.
        Awaitility.await().atMost(Duration.ofSeconds(5)).pollDelay(Duration.ofSeconds(1))
                .until(() -> true);
    }

    @BeforeEach
    void setUp() {
        mvc = webAppContextSetup(wac).apply(springSecurity()).build();

        // KHÔNG @Transactional ở class level → phải explicit cleanup giữa tests.
        // Xoá ratings cũ trước mỗi test, nếu không UPSERT-update case sẽ thấy rating cũ
        // từ test trước → assertion fail. Vet seed data từ Liquibase không touch.
        ratingRepository.deleteAll();

        // Declare test queue + binding (idempotent). Cần exchange tồn tại — autoconfig
        // PetClinicEventsAutoConfiguration đã declare khi context load.
        // Retry declare để chống ShutdownSignalException trên first connection ở CI
        // (broker chưa fully ready dù port open + log "startup complete").
        Queue queue = new Queue(TEST_QUEUE, false, false, true); // non-durable, auto-delete
        TopicExchange exchange = new TopicExchange("petclinic.events");
        Binding binding = BindingBuilder.bind(queue).to(exchange).with("vet.rating.added");
        Awaitility.await()
                .atMost(Duration.ofSeconds(15))
                .pollInterval(Duration.ofMillis(500))
                .ignoreExceptions()
                .untilAsserted(() -> {
                    rabbitAdmin.declareQueue(queue);
                    rabbitAdmin.declareBinding(binding);
                });
        // Drain bất kỳ message còn sót từ test trước (cùng queue name)
        while (rabbitTemplate.receive(TEST_QUEUE, 50L) != null) { /* drain */ }
    }

    private static RequestPostProcessor staff(String username) {
        return jwt().jwt(j -> j.claim("username", username))
                .authorities(new SimpleGrantedAuthority("ROLE_STAFF"));
    }

    private Long firstVetId() throws Exception {
        String body = mvc.perform(get("/api/v1/vets").param("active", "true").with(staff("setup")))
                .andReturn().getResponse().getContentAsString();
        return om.readTree(body).path("content").get(0).path("id").asLong();
    }

    @Test
    void addRating_insertCase_publishesEventWithUpdatedFalse() throws Exception {
        Long vetId = firstVetId();

        mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\": 5, \"description\": \"great vet\"}")
                        .with(staff("alice")))
                .andExpect(status().isCreated());

        // Poll queue tới khi nhận message (timeout 5s — afterCommit hook + RabbitMQ
        // round-trip thường < 100ms, để 5s cho CI chậm).
        Object msg = rabbitTemplate.receiveAndConvert(TEST_QUEUE, TimeUnit.SECONDS.toMillis(5));
        assertThat(msg).as("Phải nhận được vet.rating.added message trong 5s").isNotNull();

        JsonNode payload = om.valueToTree(msg);
        assertThat(payload.path("eventType").asText()).isEqualTo("vet.rating.added");
        assertThat(payload.path("source").asText()).isEqualTo("vets-service");
        assertThat(payload.path("vetId").asLong()).isEqualTo(vetId);
        assertThat(payload.path("score").asInt()).isEqualTo(5);
        assertThat(payload.path("description").asText()).isEqualTo("great vet");
        assertThat(payload.path("customerName").asText()).isEqualTo("alice");
        assertThat(payload.path("updated").asBoolean()).isFalse(); // INSERT case
        assertThat(payload.path("eventId").asText()).isNotEmpty();
        assertThat(payload.path("occurredAt").asText()).isNotEmpty();
        assertThat(payload.path("rateDate").asText()).isNotEmpty();
        assertThat(payload.path("ratingId").asLong()).isPositive();
    }

    @Test
    void addRating_upsertUpdateCase_publishesEventWithUpdatedTrue() throws Exception {
        Long vetId = firstVetId();

        // Lần 1: INSERT — drain event đầu tiên ra khỏi queue
        mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\": 5}")
                        .with(staff("bob")))
                .andExpect(status().isCreated());
        rabbitTemplate.receiveAndConvert(TEST_QUEUE, 2000L); // drain INSERT event

        // Lần 2: cùng bob, cùng vet → UPSERT update
        mvc.perform(post("/api/v1/vets/{vetId}/ratings", vetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\": 2, \"description\": \"changed mind\"}")
                        .with(staff("bob")))
                .andExpect(status().isCreated());

        Object msg = rabbitTemplate.receiveAndConvert(TEST_QUEUE, TimeUnit.SECONDS.toMillis(5));
        assertThat(msg).as("UPSERT update phải publish event lần 2").isNotNull();

        JsonNode payload = om.valueToTree(msg);
        assertThat(payload.path("score").asInt()).isEqualTo(2);
        assertThat(payload.path("description").asText()).isEqualTo("changed mind");
        assertThat(payload.path("customerName").asText()).isEqualTo("bob");
        assertThat(payload.path("updated").asBoolean()).as("UPSERT update → updated=true").isTrue();
    }
}
