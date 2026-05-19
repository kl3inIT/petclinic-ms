# reviews-service — Progress note (resume helper)

> Sticky note để pick up sau khi pause. Cập nhật sau mỗi commit.
> Roadmap chi tiết: `docs/reviews-phases.md`. Locked spec: `docs/reviews-spec.md`.

---

## Branch + commit history

Branch: **`nhat-anh`**
Pushed: **NO** (chưa push remote, đang local)

```
32992cf  W6+W7 — service layer + ReviewCreatedEvent + targetId Long migration   ← HEAD
0d09...  W4+W5 — repositories + visits client + DTOs        (SHA xem git log)
...      W3 — domain (enums + entities + exceptions + moderator)
7567e06  W2 schema — reviews + review_votes with auditing
47ed6d7  W1 skeleton — bootable service on 8189
```

(Lấy SHA chính xác qua `git log --oneline -10`)

---

## ✅ ĐÃ XONG

### W1 — Skeleton infra
- `settings.gradle.kts` thêm `include(":services:reviews-service")`
- `services/reviews-service/build.gradle.kts` — convention `petclinic.spring-boot-service` + 5 shared deps
- `services/reviews-service/src/main/resources/application.yml` — port **8189/9189** (8188 đã của genai)
- `config-repo/reviews-service.yml` + `-dev.yml` + `-prod.yml`
- `ReviewsServiceApplication.java` (bootstrap empty)

### W2 — Database (Liquibase)
- `db/changelog/db.changelog-master.yaml`
- `db/changelog/changes/001-init-reviews.yaml` — 4 changeset:
  - 001-create-schema-reviews
  - 002-create-table-reviews (target_id **BIGINT**, không UUID)
  - 003-create-table-review-votes (FK CASCADE + UNIQUE review_id+user_id)
  - 004-add-constraints-and-indexes (CHECK rating 1-5, target_type, status, vote_type; UNIQUE author+target; 3 index)

### W3 — Domain (D2)
- **Enums** (3): `TargetType` {VET,PRODUCT,VISIT}, `ReviewStatus` (OrderedEnum + state machine HashSet + static block), `VoteType`
- **Entity** (2): `Review` (rich domain, factory `create()`, methods `edit/approve/hide/softDelete/incrementHelpful/setHelpfulCount`), `ReviewVote` (factory `of()`, `changeVote()`)
- **Exception** (6): `ReviewNotFound`, `EditWindowExpired`, `IllegalReviewTransition`, `SelfVoteForbidden`, `ReviewAlreadyExists`, `EligibilityNotMet`
- **Moderation** (3): `ContentModerator` interface, `ModerationResult` record, `RegexProfanityModerator` impl
- **Resource**: `resources/moderation/profanity.txt` (~30 từ EN+VN+FR-CA)

### W4 — Persistence + Client (D3)
- **Repo** (3): `ReviewRepository extends JpaSpecificationExecutor` (+ `findByIdAndAuthorId`, `existsByAuthorIdAndTargetTypeAndTargetId`, `aggregateRatingDistribution` JPQL), `ReviewVoteRepository`, `ReviewSpecifications`
- **Client** (4): `VisitsClient @HttpExchange`, `VisitSummary` Tolerant Reader record, `ClientsConfig @Bean` factory, `RemoteClientsFacade @Component @CircuitBreaker` (gotcha #28)

### W5 — DTOs (D3)
- **Req** (4): `CreateReviewRequest` (`toEntity()`), `UpdateReviewRequest` (partial PATCH, `hasX()` helpers), `VoteRequest`, `HideReviewRequest`
- **Res** (2): `ReviewResponse` (`from()`), `ReviewSummaryResponse` (count + avg null-when-zero + distribution Map<1..5,Long>)

### W6 — Service (D4)
- `ReviewService` interface (10 method)
- `ReviewServiceImpl @Service @Transactional`:
  - USER: `create / findById / search / update / softDelete / vote / summary`
  - ADMIN: `approve / hide / unhide / adminDelete`
  - `checkEligibility()` private — VET/VISIT call `RemoteClientsFacade.fetchVisit()`, kiểm `status=COMPLETED` + `customerUserId=author`. PRODUCT skip v1
  - `publishCreated()` private — best-effort qua `ObjectProvider<EventPublisher>` (gotcha #22)
  - Edit window const `Duration.ofDays(7)` từ `created_date` audit

### W7 — Event (D5 partial)
- `ReviewCreatedEvent` record implements `DomainEvent` — routing key `review.created`
- Wire vào `ReviewServiceImpl.create()`

### Design fix (đã apply)
- `target_id` chuyển từ `UUID` → **`Long`** trong toàn stack (vets/products/visits đều BIGSERIAL). Bỏ `targetIdToVisitId()` hash hack.

---

## ⏳ CHƯA LÀM

### W8 — Web layer (D5 còn lại)
File cần tạo:
1. `controller/ReviewController.java` (USER):
   - `POST /api/v1/reviews` → `createReview` (201 + Location)
   - `GET /api/v1/reviews` → `searchReviews` (paginated, filter `targetType`, `targetId`, `minRating`)
   - `GET /api/v1/reviews/{id}` → `getReview`
   - `PATCH /api/v1/reviews/{id}` → `updateReview` (own + edit window)
   - `DELETE /api/v1/reviews/{id}` → `deleteReview` (soft, 204)
   - `POST /api/v1/reviews/{id}/vote` → `voteReview`
   - `GET /api/v1/reviews/summary?targetType=&targetId=` → `getReviewsSummary`
   - `GET /api/v1/reviews/me` → `listMyReviews`
2. `controller/ReviewModerationController.java` (ADMIN/STAFF):
   - `GET /api/v1/admin/reviews` → `listPendingReviews`
   - `PATCH /api/v1/admin/reviews/{id}/approve` → `approveReview`
   - `PATCH /api/v1/admin/reviews/{id}/hide` → `hideReview`
   - `PATCH /api/v1/admin/reviews/{id}/unhide` → `unhideReview`
   - `DELETE /api/v1/admin/reviews/{id}` → `adminDeleteReview`
3. `config/ReviewsSecurityConfig.java`:
   - permitAll: GET `/api/v1/reviews/**` (public list)
   - `hasAnyRole("STAFF","ADMIN")`: GET `/admin/reviews/**`, PATCH approve/hide
   - `hasRole("ADMIN")`: DELETE `/admin/reviews/**`, PATCH unhide
   - rest: authenticated

**Pattern reference**:
- `services/visits-service/src/main/java/com/mss301/petclinic/visits/controller/VisitController.java`
- `services/visits-service/src/main/java/com/mss301/petclinic/visits/config/VisitsSecurityConfig.java`

**Quy tắc cần nhớ khi viết controller**:
- Method name UNIQUE cross-service (gotcha #23) — đã chuẩn bị tên ở trên
- `@AuthenticationPrincipal Jwt jwt` → `UUID.fromString(jwt.getSubject())` = authorId, `jwt.getClaimAsString("username")` = authorName
- `Set<String> PRIVILEGED_ROLES = Set.of("STAFF", "ADMIN")` cho admin list filter

### W9 — Ops (D6)
- `services/reviews-service/Dockerfile` (copy từ visits-service, đổi service name)
- `.run/reviews-service.run.xml` (Spring Boot type, WORKING_DIRECTORY=$PROJECT_DIR$, SHORTEN_COMMAND_LINE=ARGS_FILE)
- Sửa `.run/petclinic-apps.run.xml` thêm `<toRun>` cho reviews-service
- Sửa `compose.yaml` profile `apps`: thêm service block (image, port 8189:8189 + 9189:9189, depends_on healthcheck config + discovery)

### W10 — Verification (D7)
12 checkpoint manual — xem `reviews-phases.md` W10. Cần full stack lên (config + discovery + auth + visits + gateway + RabbitMQ).

---

## ⚠️ Lưu ý khi resume

1. **JAVA_HOME**: Gradle CLI cần JDK 25 ở `C:/Users/Admin/.jdks/temurin-25.0.2`. Lệnh ví dụ:
   ```bash
   JAVA_HOME='/c/Users/Admin/.jdks/temurin-25.0.2' PATH="/c/Users/Admin/.jdks/temurin-25.0.2/bin:$PATH" ./gradlew :services:reviews-service:compileJava
   ```
   Lưu ý: gradle daemon hay bị Windows ephemeral port collision (Hyper-V) — verify trong IntelliJ tiện hơn.

2. **Disk D:** từng đầy lúc làm. Trước khi code tiếp check `df -h /d` ≥ 2GB.

3. **W6 chưa được compile-verified** end-to-end vì Gradle CLI bị block. Có thể có lỗi nhỏ (vd typo import) — cần sync IntelliJ + xem inspection trước khi sang W8.

4. **Pattern resume**: mỗi wave xong = `git add services/reviews-service/ && git commit -m "feat(reviews): Wx — ..."`. Push cuối D7 sau khi W10 verify pass.

5. **Eligibility check business rule (W6)**: targetId của VET review = visitId (FE pass visitId — không phải vetId — vì rule "review VET phải qua 1 visit cụ thể"). Document này lock spec — không tự đổi.

---

## Resume cheat sheet

```bash
# 1. Sync state
cd 'D:\Coursera\Summer2026\MSS133\Project\petclinic-ms'
git log --oneline -10                # confirm HEAD = 32992cf (W6+W7)

# 2. Read doc
cat docs/reviews-spec.md             # nghiệp vụ
cat docs/reviews-phases.md           # flow + dependency
cat docs/reviews-progress.md         # file này

# 3. Tiếp W8 — Web layer
# Đọc visits-service controller + security làm template
ls services/visits-service/src/main/java/com/mss301/petclinic/visits/controller/
ls services/visits-service/src/main/java/com/mss301/petclinic/visits/config/

# 4. Sau khi viết W8 — commit, sang W9
```

---

## Task tracker hiện trạng

| # | Task | Status |
|---|---|---|
| 1-8 | W1 + W2 | ✅ |
| 9-12 | W3 (D2) | ✅ |
| 13-15 | W4 + W5 (D3) | ✅ |
| 16 | W6 ReviewService + Impl | ✅ |
| 17 | W7 ReviewCreatedEvent | ✅ |
| **18** | **W8 — 2 Controllers + SecurityConfig** | **⏳ pending** ← START HERE |
| 19 | W9 Ops (Dockerfile + .run + compose) | ⏳ pending |
| 20 | W10 E2E verify | ⏳ pending |
| 21 | Final push | ⏳ pending |
