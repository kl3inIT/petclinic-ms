# reviews-service — Phase Tracker

> Tracking implementation của `reviews-service` (Phase 13 — polymorphic review cho VET/PRODUCT/VISIT).
> Port: **8189** (app) / **9189** (mgmt) — 8188 đã bị genai-service chiếm. Schema Postgres: `reviews`.
> Mỗi wave = 1 nhóm task có thể commit chung; wave có dependency phải xong wave trước.

---

## Roadmap tổng quan

| Wave | Nội dung | Phụ thuộc | Parallel-safe | Status | SHA |
|---|---|---|---|---|---|
| **W1** | Skeleton infra (Gradle + app.yml + config-repo + boot rỗng) | shared/* đã có | ❌ tuần tự | ⏳ Pending | — |
| **W2** | Database (Liquibase 5 changeset) | W1 | ❌ tuần tự | ⏳ Pending | — |
| **W3** | Domain layer (enum + entity + exception + moderator) | W2 | ✅ 3 group parallel | ⏳ Pending | — |
| **W4** | Persistence + External clients | W3 | ✅ 2 group parallel | ⏳ Pending | — |
| **W5** | DTOs (req + res records) | W3 | ✅ all parallel | ⏳ Pending | — |
| **W6** | Service layer (interface + impl) | W3+W4+W5 | ❌ tuần tự | ⏳ Pending | — |
| **W7** | Events (ReviewCreatedEvent + publish) | W6 | ✅ parallel W8 | ⏳ Pending | — |
| **W8** | Web layer (controller + security) | W6 | ✅ parallel W7 | ⏳ Pending | — |
| **W9** | Ops (Dockerfile + .run + compose.yaml) | W8 | ❌ tuần tự | ⏳ Pending | — |
| **W10** | Verification (boot + smoke + Swagger + RabbitMQ) | W9 + visits-service up | ❌ manual | ⏳ Pending | — |

---

## Tiền đề (PHẢI CÓ trước khi bắt đầu W1)

| Pre-req | Cách verify |
|---|---|
| Postgres profile `db` lên | `docker compose --profile db up -d` + `pg_isready` |
| `discovery-server` boot OK | `curl localhost:8761/actuator/health` |
| `config-server` boot OK | `curl localhost:8888/actuator/health` |
| `auth-service` mint được JWT | POST `/api/v1/auth/login` lấy access token |
| `visits-service` chạy (eligibility check) | `curl localhost:8184/actuator/health` |
| Shared modules đã build: common-web/jpa/security/clients/events | `./gradlew :shared:common-events:assemble` OK |

---

## 7 quyết định kiến trúc (chốt trước khi code)

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Eligibility VET/VISIT → gọi `VisitsClient` REST tại POST | Đơn giản hơn event-driven; cache sau |
| 2 | Eligibility PRODUCT → skip Iter 1 | Chưa có billing-service |
| 3 | Vote idempotency → bảng `review_votes` UNIQUE(reviewId,userId), upsert/flip | Pattern Stack Overflow |
| 4 | Edit window 7 ngày → tính từ `created_date` audit column | Một nguồn sự thật |
| 5 | `authorName` → snapshot từ JWT claim `username` lúc create | Tránh join user-service mỗi GET |
| 6 | Moderation → regex sync, interface `ContentModerator` | Swap được sang OpenAI moderation sau |
| 7 | Skip publish `review.voted` event v1 | Chưa có consumer thực sự |

---

## Hard rules (giống vets-phases.md)

1. **Không Lombok**, DTO là `record`, entity viết tay getter (`extends AbstractAuditingEntity`).
2. **Không mapper layer** — `from()` / `toEntity()` static trên record.
3. **Service interface + Impl split** (`service/` + `service/impl/`).
4. **Method name controller UNIQUE cross-service**: `listReviews`, `getReview`, `createReview` — KHÔNG `list`/`get`/`create` (gateway aggregate OpenAPI sẽ collision).
5. **Enum DB-persisted** implement `IdentifiedEnum`; `ReviewStatus` dùng `OrderedEnum` (state machine).
6. **POST 201** + `Location` header; **DELETE 204**; **PATCH partial**.
7. **Path-tamper protection**: lookup `findByIdAndAuthorId(...)` khi USER edit/delete → 404 không leak existence.
8. **Liquibase tracking trong `public`** (xem gotcha CLAUDE.md). Changeset 001 `CREATE SCHEMA IF NOT EXISTS reviews`.
9. **CHECK constraint DB** (rating 1-5) + Bean Validation DTO (defense-in-depth).
10. **Resilience4j** wrap `VisitsClient` call (timeout + circuit breaker), extract qua `RemoteClientsFacade` để tránh self-invocation (gotcha #28).

---

## Wave 1 — Skeleton infra

**Output**: service boot được, `/actuator/health` = UP, KHÔNG có endpoint nghiệp vụ.

**Tasks (tuần tự, không parallel)**:
1. `settings.gradle.kts` → `include(":services:reviews-service")`
2. `services/reviews-service/build.gradle.kts` — apply `petclinic.spring-boot-service` + deps:
   - `project(":shared:common-web")` + `common-jpa` + `common-security` + `common-clients` + `common-events`
   - `org.springframework.boot:spring-boot-starter-data-jpa`
   - `org.springframework.boot:spring-boot-starter-validation`
   - `org.postgresql:postgresql`
   - `org.liquibase:liquibase-core`
   - `org.springdoc:springdoc-openapi-starter-webmvc-ui`
   - `io.github.resilience4j:resilience4j-spring-boot3`
   - test: `spring-boot-starter-test` + `testcontainers-postgresql`
3. `src/main/resources/application.yml` (< 20 dòng): name, profiles, config import, port 8188/9188, docker compose file.
4. `config-repo/reviews-service.yml` (JPA schema + ddl-auto validate + Liquibase changelog path)
5. `config-repo/reviews-service-dev.yml` (datasource fallback `localhost:5433`)
6. `config-repo/reviews-service-prod.yml` (env-driven DB_URL/DB_USER/DB_PASSWORD)
7. `src/main/java/com/mss301/petclinic/reviews/ReviewsApplication.java` (chỉ `@SpringBootApplication`)
8. **Checkpoint**: `./gradlew :services:reviews-service:bootRun` → boot OK, JetBrains `get_file_problems` mọi YAML.

**Commit message**: `feat(reviews): W1 skeleton — bootable service on 8188`

---

## Wave 2 — Database

**Output**: schema `reviews` + 2 table với audit columns đã apply qua Liquibase.

**Tasks (tuần tự)**:
1. `db/changelog/db.changelog-master.yaml` — includeAll
2. `001-create-reviews-schema.yaml` — `CREATE SCHEMA IF NOT EXISTS reviews` (KHÔNG khai `schemaName`)
3. `002-create-reviews-table.yaml` — `reviews.reviews` (id BIGSERIAL PK, target_type VARCHAR(20), target_id UUID, author_id UUID, author_name VARCHAR(120), rating INT CHECK 1-5, title VARCHAR(120), comment TEXT, status VARCHAR(30), helpful_count INT DEFAULT 0, version BIGINT) + indexes (target_type,target_id), author_id, status.
4. `003-create-review-votes-table.yaml` — `reviews.review_votes` (id BIGSERIAL PK, review_id FK CASCADE → reviews, user_id UUID, vote_type VARCHAR(15)) + UNIQUE(review_id, user_id).
5. `004-add-auditing-columns.yaml` — 4 cột audit cho cả 2 table.
6. **Checkpoint**: boot lại → Liquibase apply OK; psql `\dt reviews.*` thấy 2 bảng.

**Commit**: `feat(reviews): W2 schema — reviews + review_votes with auditing`

---

## Wave 3 — Domain layer

**Output**: enums + entity + exception + moderator (chưa wire vào service).

**Parallel groups**:

### Group A — Enums (độc lập, làm song song)
- `model/TargetType.java` (VET, PRODUCT, VISIT) — `IdentifiedEnum`
- `model/ReviewStatus.java` — `OrderedEnum`:
  - PUBLISHED(10), PENDING_MODERATION(20), FLAGGED(30), HIDDEN(40), DELETED(99 terminal)
  - State machine: PUBLISHED ⇌ HIDDEN, PUBLISHED → DELETED, PENDING_MODERATION → {PUBLISHED, HIDDEN}, FLAGGED → {PUBLISHED, HIDDEN, DELETED}
  - **Dùng `HashSet` + static block** (tránh `ClassCastException` EnumSet — gotcha #16)
- `model/VoteType.java` (HELPFUL, NOT_HELPFUL) — `IdentifiedEnum`

### Group B — Exceptions (độc lập)
- `exception/ReviewNotFoundException.java` extends `ResourceNotFoundException` (super `"Review", id`)
- `exception/EditWindowExpiredException.java` extends `BadRequestAlertException` (errorKey `error.edit-window-expired`)
- `exception/IllegalReviewTransitionException.java` extends `BadRequestAlertException`
- `exception/SelfVoteForbiddenException.java` extends `BadRequestAlertException`

### Group C — Moderation (độc lập)
- `service/moderation/ContentModerator.java` (interface với `ModerationResult check(String title, String comment)`)
- `service/moderation/RegexProfanityModerator.java` (`@Service`, regex từ classpath `moderation/profanity.txt`)

### Sau khi A+B+C xong (depends):
- `model/Review.java` (`@Entity`, rich domain):
  - Factory `Review.create(targetType, targetId, authorId, authorName, rating, title, comment, status)`
  - Methods: `edit()`, `hide()`, `approve()`, `softDelete()`, `incrementHelpful()`, `decrementHelpful()`
  - `private transitionTo(ReviewStatus next)` validate state machine
  - **KHÔNG setter**
- `model/ReviewVote.java` (`@Entity`, FK Review)

**Commit**: `feat(reviews): W3 domain — Review aggregate + state machine + moderator`

---

## Wave 4 — Persistence + Clients (parallel-friendly)

### Group D — Repositories (depends W3)
- `repository/ReviewRepository.java` extends `JpaRepository<Review, Long>, JpaSpecificationExecutor<Review>` + `findByIdAndAuthorId(Long, UUID)`.
- `repository/ReviewVoteRepository.java` + `findByReviewIdAndUserId(Long, UUID)` + `countByReviewIdAndVoteType(Long, VoteType)`.
- `repository/ReviewSpecifications.java` — filter theo `targetType`/`targetId`/`status`/`authorId`/`minRating` (tránh JPQL `:param IS NULL OR ...` — gotcha #17).

### Group E — Clients (depends W1 only — chạy song song W3 được)
- `client/dto/VisitSummary.java` (record Tolerant Reader: id, status, customerUserId, vetId — KHÔNG re-use visits-service entity)
- `client/VisitsClient.java` (`@HttpExchange` interface, GET `/api/v1/visits/{id}`)
- `client/RemoteClientsFacade.java` (`@Component`, wrap `@CircuitBreaker(name="visits-service", fallbackMethod="fetchVisitFallback")` + `@TimeLimiter` — extract sang bean riêng vì self-invocation bypass AOP, gotcha #28)
- `client/ReviewsClientsConfig.java` (`@Configuration` + `@Bean` factory dùng `@LoadBalanced RestClient.Builder` qua `HttpServiceProxyFactory`)
- `config-repo/reviews-service.yml` thêm `resilience4j.circuitbreaker.instances.visits-service.*`

**Commit**: `feat(reviews): W4 persistence + visits client with circuit breaker`

---

## Wave 5 — DTOs (all parallel-safe)

- `dto/req/CreateReviewRequest.java` (targetType, targetId, rating `@Min(1) @Max(5)`, `@NotBlank` title `@Size(max=120)`, `@NotBlank` comment `@Size(max=2000)`) + `toEntity(authorId, authorName, status)`
- `dto/req/UpdateReviewRequest.java` (rating/title/comment nullable cho PATCH partial; boxed Integer)
- `dto/req/VoteRequest.java` (`@NotNull` voteType)
- `dto/req/HideReviewRequest.java` (`@NotBlank` reason `@Size(max=500)`)
- `dto/res/ReviewResponse.java` + `from(Review)`
- `dto/res/ReviewSummaryResponse.java` (count Long, average BigDecimal nullable, distribution `Map<Integer, Long>` luôn đủ 5 key 1..5)

**Commit**: `feat(reviews): W5 request/response DTOs`

---

## Wave 6 — Service layer (depends W3+W4+W5)

- `service/ReviewService.java` (interface với 9 method)
- `service/impl/ReviewServiceImpl.java` (`@Service @Transactional`)
  - `create(req, authorId, authorName)`:
    1. Nếu targetType ∈ {VET, VISIT}: gọi `RemoteClientsFacade.fetchVisit(...)` check `status=COMPLETED` + `customerUserId=authorId`. Fail → `BadRequestAlertException("error.eligibility")`.
    2. Run `ContentModerator.check(...)`. Hit profanity → status = `PENDING_MODERATION`, else `PUBLISHED`.
    3. Save + publish `ReviewCreatedEvent` (W7) qua `ObjectProvider<EventPublisher>` (try/catch broker down).
  - `update(id, req, currentUserId)`: lookup `findByIdAndAuthorId` → 404. Check edit window 7 ngày `Duration.between(getCreatedDate(), now()) > 7d` → throw. Re-run moderation nếu comment/title đổi.
  - `softDelete(id, currentUserId)`: ownership check + `entity.softDelete()`.
  - `vote(id, voteType, currentUserId)`: chặn self-vote (`review.authorId == currentUserId`). Upsert vote, flip nếu đã có. Recompute `helpful_count = HELPFUL count`.
  - `findById(id)` / `search(spec, pageable)` / `summary(targetType, targetId)` (JPQL `SELECT new dto(COUNT, AVG, ...) GROUP BY rating`).
  - Moderation: `approve(id)` / `hide(id, reason)` / `adminDelete(id)`.

**Commit**: `feat(reviews): W6 service layer with eligibility + moderation + voting`

---

## Wave 7 — Events (parallel W8)

- `events/ReviewCreatedEvent.java` (record implements `DomainEvent`, `routingKey = "review.created"`)
- Wire `EventPublisher` injection vào `ReviewServiceImpl.create()` qua `ObjectProvider<EventPublisher>` (graceful nếu broker down — gotcha #22).
- `config-repo/reviews-service.yml`: `petclinic.events.enabled: true`, exchange default `petclinic.events`.
- `config-repo/reviews-service-test.yml` (nếu chưa có): `petclinic.events.enabled: false`.

**Commit**: `feat(reviews): W7 publish review.created event`

---

## Wave 8 — Web layer (parallel W7)

- `controller/ReviewController.java`:
  - `POST /api/v1/reviews` → `createReview` (USER, 201+Location)
  - `GET /api/v1/reviews` → `searchReviews` (paginated, public)
  - `GET /api/v1/reviews/{id}` → `getReview` (public)
  - `PATCH /api/v1/reviews/{id}` → `updateReview` (USER, own only)
  - `DELETE /api/v1/reviews/{id}` → `deleteReview` (USER, own, 204)
  - `POST /api/v1/reviews/{id}/vote` → `voteReview` (USER)
  - `GET /api/v1/reviews/summary` → `getReviewsSummary` (public, query `targetType` + `targetId`)
- `controller/ReviewModerationController.java`:
  - `GET /api/v1/admin/reviews` → `listPendingReviews` (STAFF/ADMIN)
  - `PATCH /api/v1/admin/reviews/{id}/approve` → `approveReview`
  - `PATCH /api/v1/admin/reviews/{id}/hide` → `hideReview`
  - `DELETE /api/v1/admin/reviews/{id}` → `adminDeleteReview` (ADMIN only)
- `config/ReviewsSecurityConfig.java` (override common-security default chain):
  - `permitAll`: `/actuator/health/**`, `/v3/api-docs/**`, `/swagger-ui/**`
  - `permitAll`: GET `/api/v1/reviews/**` (public read)
  - `hasAnyRole("STAFF","ADMIN")`: PATCH `/api/v1/admin/reviews/*/approve`, PATCH `/.../hide`, GET `/api/v1/admin/reviews/**`
  - `hasRole("ADMIN")`: DELETE `/api/v1/admin/reviews/**`
  - `authenticated()`: còn lại (POST/PATCH/DELETE non-admin + vote)

**Commit**: `feat(reviews): W8 REST API + role-based filter chain`

---

## Wave 9 — Ops

- `services/reviews-service/Dockerfile` (copy template từ `services/visits-service/Dockerfile`, đổi service tên).
- `.run/reviews-service.run.xml` (Spring Boot type, WORKING_DIRECTORY=$PROJECT_DIR$, SHORTEN_COMMAND_LINE=ARGS_FILE)
- `.run/petclinic-apps.run.xml` thêm `<toRun>` cho reviews-service
- `compose.yaml` profile `apps`: thêm service block (image, port 8188:8188 + 9188:9188, depends_on health-check config-server + discovery-server, env `SPRING_PROFILES_ACTIVE` + `EUREKA_URL` + `CONFIG_SERVER_URL`).

**Commit**: `chore(reviews): W9 containerize + run configs`

---

## Wave 10 — Verification (manual checkpoints)

| # | Bước | Cách test |
|---|---|---|
| 1 | Service boot OK | `./gradlew :services:reviews-service:bootRun` → `/actuator/health` UP |
| 2 | Liquibase apply | `psql -h localhost -p 5433 -U petclinic -d petclinic -c "\dt reviews.*"` |
| 3 | YAML hợp lệ | JetBrains MCP `get_file_problems` tất cả YAML (mandatory) |
| 4 | Mint JWT | `POST localhost:8183/api/v1/auth/login` lấy access token |
| 5 | POST review eligibility check | tạo visit COMPLETED qua visits-service → POST review VET → 201 |
| 6 | POST review thiếu eligibility | targetId không có visit → 400 `error.eligibility` |
| 7 | Edit window | PATCH ngay → 200; mock created_date < now - 7d → 400 `error.edit-window-expired` |
| 8 | Self-vote chặn | POST vote với JWT của author → 400 `error.self-vote-forbidden` |
| 9 | Moderation profanity | comment chứa từ trong `profanity.txt` → status=PENDING_MODERATION |
| 10 | Admin approve | PATCH `/admin/reviews/{id}/approve` với JWT STAFF → 200, status=PUBLISHED |
| 11 | Swagger gateway | mở `http://localhost:8180/swagger-ui.html` → dropdown có `reviews-service` |
| 12 | Event xuất hiện | RabbitMQ UI `localhost:15672` → exchange `petclinic.events` → message routing key `review.created` |

---

## Việc bị block (cần thứ khác xong trước)

| Block | Block by | Mở khóa khi nào |
|---|---|---|
| W2 changeset | W1 (build.gradle có Liquibase dep) | sau khi gradle sync |
| Tất cả entity (Review/ReviewVote) | W3 Group A (enums) | sau A+B+C xong |
| W6 (service impl) | W4 (cần repo + facade) + W5 (cần DTO) | song song W4 và W5 xong |
| W10 step 5-6 (eligibility test) | `visits-service` up + có visit COMPLETED | dev tự seed |
| W10 step 12 (event verify) | RabbitMQ profile `mq` up | `docker compose --profile mq up -d` |
| FE Iter 1 | toàn bộ Iter 1 BE pass W10 | sau khi Swagger OK |
| PRODUCT eligibility | `billing-service` (Phase chưa định) | skip Iter 1 |

---

## Việc có thể làm NGAY (không depend gì)

- Đọc gotcha #16 (EnumSet trap), #17 (JPQL NULL param), #22 (ObjectProvider), #23 (operationId unique), #28 (CB self-invocation) trong `CLAUDE.md` — sẽ apply trong code.
- Mở `services/visits-service/src/main/java/.../client/` → đọc pattern client + facade để copy.
- Mở `services/visits-service/.../config/VisitsSecurityConfig.java` → copy pattern filter chain.
- Mở `services/vets-service/.../db/changelog/` → copy pattern Liquibase numbering + audit changeset.
- Chuẩn bị `profanity.txt` (10-20 từ regex tiếng Việt + tiếng Anh) để bỏ vào `src/main/resources/moderation/`.

---

## Hướng dẫn cho dev tiếp tục (resume sau khi pull)

1. `git pull origin nhat-anh`
2. `docker compose --profile db --profile mq up -d`
3. Start `config-server` → `discovery-server` → `auth-service` → `visits-service` (qua compound `.run/petclinic-infra.run.xml` + `.run/petclinic-apps.run.xml`).
4. Mở `docs/reviews-phases.md` (file này) → tìm wave tiếp theo có status ⏳ → làm.
5. Mỗi wave xong: chạy test + JetBrains `get_file_problems` + commit + cập nhật cột Status + SHA trong roadmap table.

**File cần xem trước khi code wave mới**:
- `shared/common-jpa/.../AbstractAuditingEntity.java` — base entity
- `shared/common-clients/.../JwtForwardInterceptor.java` — JWT forward pattern
- `shared/common-events/.../EventPublisher.java` — publish pattern + `EventQueues.consumer()`
- `services/visits-service/.../model/VisitStatus.java` — OrderedEnum + state machine pattern
- `services/visits-service/.../config/VisitsSecurityConfig.java` — filter chain pattern
- `services/visits-service/.../client/` — RestClient `@HttpExchange` + facade pattern
- `CLAUDE.md` gotcha #14, #16, #17, #22, #23, #28 — pitfalls chắc chắn gặp
