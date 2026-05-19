# Testing Guide — petclinic-ms

Pattern thống nhất cho mọi microservice. Đọc trước khi viết test mới.

## Test Pyramid

```
                  /\
                 /  \  E2E (Playwright)        — 2-3 happy path
                /----\
               /      \  Integration            — 5-10 per service
              /  full  \  @SpringBootTest + Postgres Testcontainer
             /----------\
            /            \  Slice                — 10-20 per service
           /  @WebMvcTest \  @WebFluxTest, @DataJpaTest
          /----------------\
         /                  \  Unit              — 50+ per service
        /  Mockito @Mock     \  no Spring context, ~10ms each
       /----------------------\
```

**Quy tắc:** càng lên cao, càng ít test, càng chậm. Nếu chọn được unit thay slice — chọn unit. Nếu chọn được slice thay integration — chọn slice.

## Khi nào dùng cái nào

| Test kind | When | Annotation | Speed |
|---|---|---|---|
| **Unit** | Business logic in service class với mocked dependencies | `@ExtendWith(MockitoExtension.class)` + `@Mock` + `@InjectMocks` | <50ms |
| **Web slice** | Controller routing/validation/serialization | `@WebMvcTest(C.class)` + `@MockitoBean` | ~1s |
| **Reactive slice** | WebFlux controller (genai-service) | `@WebFluxTest(C.class)` + WebTestClient + `@MockitoBean` | ~1-2s |
| **JPA slice** | Repository query methods, JPQL, Specifications | `@DataJpaTest` + Testcontainers | ~5s |
| **Integration** | Cross-layer flow + real DB | `@SpringBootTest` + `extends AbstractPostgresIntegrationTest` | ~10-30s |
| **E2E** | User journey FE → BE → DB | Playwright spec (apps/web/e2e) | ~30s |

## Spring Boot 4 changes — đừng dùng pattern cũ

| Cũ (Boot 3) | Mới (Boot 4) |
|---|---|
| `@MockBean` | **`@MockitoBean`** (`org.springframework.test.context.bean.override.mockito`) |
| `@SpyBean` | **`@MockitoSpyBean`** |
| `org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest` | **`org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest`** |
| Same package cũ cho WebFlux | **`org.springframework.boot.webflux.test.autoconfigure.WebFluxTest`** |
| MockMvc only | Có thêm **`MockMvcTester`** fluent API |

Module tách:
- `spring-boot-webmvc-test` → `@WebMvcTest`, `@AutoConfigureMockMvc`
- `spring-boot-webflux-test` → `@WebFluxTest`
- `spring-boot-jpa-test` → `@DataJpaTest`

`shared/common-testing` đã include `webmvc-test` mặc định. WebFlux service tự add:
```kotlin
testImplementation("org.springframework.boot:spring-boot-webflux-test")
```

## Pattern per layer

### 1. Unit test — Mockito only

```java
@ExtendWith(MockitoExtension.class)
class OwnerServiceImplTest {
    @Mock OwnerRepository repository;
    @InjectMocks OwnerServiceImpl service;

    @Test
    void findById_missing_throws() {
        given(repository.findById(999L)).willReturn(Optional.empty());
        assertThatThrownBy(() -> service.findById(999L))
                .isInstanceOf(OwnerNotFoundException.class);
    }
}
```

**Tránh:** `@SpringBootTest` cho test pure business logic. Spring context tốn ~5s khởi tạo.

### 2. Web slice — `@WebMvcTest` (servlet)

```java
@WebMvcTest(OwnerController.class)
@Import(ExceptionTranslator.class)   // @RestControllerAdvice cross-module, không auto-scan
class OwnerControllerTest {
    @Autowired MockMvc mockMvc;
    @MockitoBean OwnerService service;

    @Test
    void list_returnsPage() throws Exception {
        given(service.findAll(any(), any())).willReturn(new PageImpl<>(List.of(...)));
        mockMvc.perform(get("/api/v1/owners")
                .with(jwt().jwt(JwtTestSupport.userJwt()).authorities(JwtTestSupport.userAuthorities())))
            .andExpect(status().isOk());
    }
}
```

**Note:** @WebMvcTest default security chain permitAll. Test auth enforcement (401) ở integration layer.

### 3. Reactive slice — `@WebFluxTest`

```java
@WebFluxTest(ChatController.class)
@Import(ExceptionTranslator.class)
class ChatControllerTest {
    @Autowired WebTestClient webTestClient;
    @MockitoBean LlmClientHolder clientHolder;

    @Test
    void chat_llmNotReady_returns5xx() {
        given(clientHolder.isReady()).willReturn(false);
        webTestClient
            .mutateWith(mockJwt().jwt(JwtTestSupport.userJwt()).authorities(JwtTestSupport.userAuthorities()))
            .post().uri("/api/v1/ai/chat")
            .contentType(MediaType.APPLICATION_JSON).bodyValue("""{"message":"test"}""")
            .exchange()
            .expectStatus().is5xxServerError();
    }
}
```

**Reactor test** dùng `StepVerifier`:
```java
StepVerifier.create(myFlux)
    .expectNext("a", "b")
    .verifyComplete();
```

### 4. Integration — `@SpringBootTest` + Postgres Testcontainer

```java
@SpringBootTest
@AutoConfigureMockMvc
@Transactional   // rollback DB sau mỗi test → seed không bị pollute
@TestPropertySource(properties = {
    "spring.cloud.config.enabled=false",
    "spring.cloud.discovery.enabled=false",
    "eureka.client.enabled=false",
    "petclinic.auth.jwt.jwk-set-uri=http://localhost:0/jwks-not-used-in-test",
    "spring.jpa.properties.hibernate.default_schema=customers",
    "spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.yaml",
})
class OwnerIntegrationTest extends AbstractPostgresIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired OwnerRepository repository;

    @Test
    void createAndFetchOwner_persists() throws Exception {
        // POST + GET, verify rò qua repository.count()
    }
}
```

**Tại sao `extends AbstractPostgresIntegrationTest`?**
- Singleton container — share giữa các test class trong JVM
- Spring context cache theo config — Boot context tái dùng → test cycle nhanh

**Tại sao `@TestPropertySource` các flag config?**
- Cloud config / Eureka tắt: không cần config-server/discovery-server up
- `petclinic.auth.jwt.jwk-set-uri`: common-security yêu cầu URL hợp lệ. URL fake OK vì `mockJwt()` bypass validation
- `default_schema`: config-repo property không load khi cloud.config tắt → set manual

## Spring AI testing strategy

Spring AI bean (`ChatClient`, `OpenAIClient`, `VectorStore`) là pain để mock real. Strategy:

| Cần test | Cách làm |
|---|---|
| Controller routing | `@MockitoBean LlmClientHolder` — controller dependency, mock isReady/syncClient |
| LlmConfigService logic | Pure Mockito `@Mock LlmConfigRepository, AesGcmEncryptor` |
| VectorStore similarity | In-memory `SimpleVectorStore.builder(embeddingModel).build()` + canned docs |
| ChatMemory | `InMemoryChatMemoryRepository` (built-in Spring AI test fixture) |
| Tool call resolution | Hand-roll `FunctionToolCallback` với mock backend |
| Streaming SSE | **Skip ở unit/slice.** Integration test với real OpenAI hoặc WireMock fake `/chat/completions`. |
| Temperature determinism | `OpenAiChatOptions.builder().temperature(0.1).build()` cho LLM-as-evaluator tests |

**KHÔNG mock `OpenAIClient`** trực tiếp — too brittle. Mock lớp wrapper (`LlmClientHolder` đã expose `syncClient()`, `chatModelName()`).

## Shared test fixtures

### `AbstractPostgresIntegrationTest`
- Postgres container singleton (`pgvector/pgvector:pg18` cho parity)
- `@ServiceConnection` tự wire `spring.datasource.*`
- `withReuse(true)` — dev local cycle nhanh

### `JwtTestSupport`
- `userJwt()` / `adminJwt()` — fixed UUID, claims, roles
- `userAuthorities()` / `adminAuthorities()` — `Collection<GrantedAuthority>` (đúng signature cho `JwtRequestPostProcessor.authorities()`)
- `userAuthentication()` / `adminAuthentication()` — full `JwtAuthenticationToken` cho programmatic `SecurityContextHolder` set

### Dùng:
```kotlin
// build.gradle.kts của service
testImplementation(project(":shared:common-testing"))
```

## Anti-patterns — đừng làm

| ❌ | ✅ |
|---|---|
| `@SpringBootTest` cho test service logic | Mockito `@ExtendWith` unit test |
| Tạo Postgres container per test class | `extends AbstractPostgresIntegrationTest` (singleton) |
| Hardcode UUID/auth trong mỗi test | Dùng `JwtTestSupport.TEST_USER_ID` |
| `@MockBean` (Boot 3) | `@MockitoBean` (Boot 4) |
| Hit real OpenAI API trong unit test | Mock `LlmClientHolder` |
| Test exact count sau DB write | `@Transactional` rollback HOẶC use `Matchers.greaterThanOrEqualTo` |
| Bỏ qua security trong integration test | `.with(jwt().jwt(JwtTestSupport.userJwt())...)` |

## Coverage target

JaCoCo aggregate task `./gradlew jacocoAggregatedReport` xuất `build/reports/jacoco/jacocoAggregatedReport/`.

**Mục tiêu thực tế cho academic project:**
- Service layer (business logic): **>70%**
- Controller: **>60%** (routing + validation paths)
- Repository: **không track** — JPA tự test bằng Hibernate
- Config/main app class: **không track** — wiring boilerplate

KHÔNG chase 100%. Focus critical paths: auth, money, data integrity, security.

## Chạy test

```bash
# Tất cả test toàn repo
./gradlew test

# 1 service
./gradlew :services:customers-service:test

# 1 test class
./gradlew :services:customers-service:test --tests "com.mss301.petclinic.customers.controller.OwnerControllerTest"

# 1 test method
./gradlew :services:customers-service:test --tests "com.mss301.petclinic.customers.controller.OwnerControllerTest.listOwners_authenticated_returnsPage"

# Aggregate coverage report (sau khi test pass)
./gradlew jacocoAggregatedReport
# → mở build/reports/jacoco/jacocoAggregatedReport/html/index.html
```

CI auto chạy `./gradlew build jacocoAggregatedReport` mỗi PR + upload artifact JaCoCo.
