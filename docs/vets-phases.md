# vets-service — Phase Tracker

> Tracking nghiệp vụ mở rộng của `vets-service` (branch `nhat-anh`).
> Mỗi phase = 2 stage: **Stage 1** (code: entity/DTO/service/controller/Liquibase) + **Stage 2** (integration test).
> Mỗi stage 1 commit + push. Test bằng Testcontainers Postgres 18 + MockMvc + JWT mock (`ROLE_STAFF`).

---

## Roadmap tổng quan

| Phase | Nghiệp vụ | Status | Stage 1 SHA | Stage 2 SHA |
|---|---|---|---|---|
| **A** | Vet: email/phone/active/resume + filter `?active=` | ✅ Done | `b9e3c87` | `a892878` |
| **B** | Education sub-resource (CRUD nested) | ✅ Done | `51d37a9` | `8e731a2` |
| **C** | Work-schedule (Workday × WorkHour) PUT-replace | ✅ Done | `5dbf230` | `579babe` |
| **D** | Ratings (CRUD + summary + top-rated cross-vet) | ✅ Done | `fabc828` | `6f2543f` |
| **E1** | Badges (metadata, không cần MinIO) | ✅ Done | `52891c2` | `94b3fc8` |
| **E2** | Photo + Album (MinIO + multipart) | ✅ Done | `5942050` | `8aaa67b` |
| **I** | MinIO orphan-cleanup scheduled job | ✅ Done | `018212f` | `2256c33` |
| **F** | Rating customerName lấy từ JWT (anti-spoof) | ✅ Done | `7387418` | `d943cc6` |

**Tổng test hiện tại**: 76 IT pass (71 từ A-E + 5 MinioOrphanCleanupJobIT). Phase F giữ nguyên count RatingControllerIT (14 → 14: bỏ `blankCustomerName_returns400`, thêm `jwtMissingUsername_returns400` + `bodyCustomerNameField_isSilentlyIgnored`).

---

## Hard rules áp dụng cho mọi phase

1. **Không Lombok** — entity viết tay getter/setter; DTO là `record`.
2. **Không mapper layer** — `from()` / `toEntity()` static method trong record.
3. **Service interface + Impl split** (`service/` + `service/impl/`).
4. **Method name controller UNIQUE cross-service** (gateway aggregate OpenAPI): `listVetEducations` không phải `list`.
5. **DTO = record, entity = class** extends `AbstractAuditingEntity`.
6. **Enum DB-persisted** implement `IdentifiedEnum` (hoặc `OrderedEnum` nếu sortable).
7. **Path-tamper protection**: lookup `findByIdAndVetId(...)` → 404 thay vì 403 (không leak existence).
8. **PATCH partial**: `null = không đổi`, `hasX()` helper, validate blank trên field non-null.
9. **POST 201** + header `Location: /api/v1/.../{newId}` (qua `ServletUriComponentsBuilder`).
10. **DELETE 204** (resource không tồn tại vẫn → 404, theo convention GitHub/Stripe).
11. **Liquibase changeset** lưu theo numbering: 001-init, 002-audit, 003-vet-contact, 004-education, 005-work-schedule, 006-seed, 007-ratings, 008-badges.
12. **CHECK constraints DB** + Bean Validation DTO (defense-in-depth).

---

## Phase A — Vet contact + active (`b9e3c87`, `a892878`)

**Scope**: Mở rộng `Vet` entity với 4 field mới + filter `?active=`.

**Fields thêm vào `vets`**:
- `email VARCHAR(255) NOT NULL UNIQUE` (uk_vets_email, backfill `vet-<id>@petclinic.local` trước enforce)
- `phone_number VARCHAR(30)` nullable
- `active BOOLEAN NOT NULL DEFAULT TRUE`
- `resume TEXT` nullable

**Endpoint changes**:
- `GET /api/v1/vets?active=true|false` — filter mới (`VetSpecifications.filter`)
- `POST /api/v1/vets` — email required (`@NotBlank @Email @Size(255)`)
- `PATCH /api/v1/vets/{id}` — partial update với 4 field mới, `Boolean active` (boxed phân biệt unset)
- Duplicate email → 400 `error.email-exists` (catch `DataIntegrityViolation` dịch sang `BadRequestAlertException`)

**Files chính**: `model/Vet.java`, `dto/req/{VetRequest,UpdateVetRequest}.java`, `dto/res/VetResponse.java`, `service/impl/VetServiceImpl.java`, `repository/VetSpecifications.java`, `controller/VetController.java`, Liquibase `003-add-vet-contact.yaml` + sửa `006-seed-dev-data.yaml`.

**Test**: 8 IT (`VetControllerIT`) — filter active, duplicate email, PATCH partial, blank validation.

---

## Phase B — Education sub-resource (`51d37a9`, `8e731a2`)

**Scope**: Bằng cấp / đào tạo của vet (1 vet → N education).

**DB**: `vets.educations` (id, vet_id FK CASCADE, school_name, degree, field_of_study, start_date, end_date, audit) + `idx_educations_vet_id`.

**Endpoints** (`/api/v1/vets/{vetId}/educations`):
- `GET` (paginated) / `GET /{eduId}` / `POST` (201+Location) / `PATCH /{eduId}` (partial) / `DELETE /{eduId}` (204)
- `endDate = null` = đang học
- `endDate < startDate` → 400 `error.date-invalid` (validate **sau merge** partial — tránh PATCH startDate khiến endDate cũ invalid)

**Security**: VetsSecurityConfig thêm rule `DELETE /vets/*/educations/** → STAFF|ADMIN`.

**Files chính**: `model/Education.java`, `repository/EducationRepository.java` (findByIdAndVetId), `dto/{req,res}/Education*.java`, `service/impl/EducationServiceImpl.java`, `controller/EducationController.java`, Liquibase `004-create-education.yaml`.

**Test**: 10 IT — empty list, 404 path-tamper, dates validation, PATCH partial.

---

## Phase C — Work Schedule (`5dbf230`, `579babe`)

**Scope**: Lịch trực tuần của vet (template Workday × WorkHour) — input cho visits-service sau này.

**Enums** (implement `IdentifiedEnum`/`OrderedEnum` ở shared/common-jpa):
- `Workday` (MONDAY..SUNDAY) — IdentifiedEnum, `id() = name()`
- `WorkHour` (HOUR_8_9..HOUR_19_20) — OrderedEnum với `weight = hour bắt đầu` (sortable)

**DB**: `vets.vet_work_schedule` với **composite PK** `(vet_id, workday, work_hour)`. Không audit (lookup table). PK tự cover index cho query "list slot của vet" (left-prefix).

**Entity**: `WorkScheduleSlot` với `@EmbeddedId WorkScheduleSlotId`.

**Endpoints** (`/api/v1/vets/{vetId}/work-schedule`):
- `GET` — list slot sorted (workday Mon→Sun, workHour 8h→20h)
- `PUT` — **REPLACE toàn bộ** (idempotent). Body `{slots: [{workday, workHour}, ...]}`. Empty slots = clear all.
- `DELETE` — clear all (204)

**Gotcha**: Service `deleteAllByVetId + flush + saveAll` — flush bắt buộc giữa delete và insert cùng tx (Hibernate có thể queue insert TRƯỚC delete → PK collision).

**Validation**: dup slot trong request → 400 `error.slot-duplicate`. Invalid enum value → 400 ProblemDetail (Jackson HttpMessageNotReadable).

**Security**: thêm rule `DELETE /vets/*/work-schedule/** → STAFF|ADMIN`.

**Test**: 9 IT — sort, REPLACE-not-merge, idempotent (2 lần PUT cùng body → bytes giống nhau), clear, dup, invalid enum.

---

## Phase D — Ratings (`fabc828`, `6f2543f`)

**Scope**: Đánh giá customer cho vet (1-5 sao) + summary + cross-vet aggregate.

**DB**: `vets.ratings` (id, vet_id FK CASCADE, score INTEGER, description, customer_name, rate_date TIMESTAMPTZ default NOW(), audit) + CHECK `ck_ratings_score` (1-5) + index vet_id.

**Endpoints**:
- `/api/v1/vets/{vetId}/ratings`:
  - `GET` (paginated), `POST` (201+Location), `DELETE /{ratingId}` (204)
  - **KHÔNG có PATCH** — rating immutable (Stripe/Amazon pattern)
  - `GET /summary` → `{count, average (null nếu 0), distribution Map<1..5, Long> luôn đủ 5 key}`
- `/api/v1/vets/top-rated?limit=3` (standalone — cross-vet aggregate, không nested):
  - JPQL implicit join Vet × Rating WHERE v.active=true ORDER BY AVG(score) DESC, COUNT DESC
  - `limit 1-50` validate ở service throw `BadRequestAlertException` (KHÔNG dùng `@Validated` + `@Min/@Max` vì `ConstraintViolationException` không được `ExceptionTranslator` handle)

**Score validate 3 layer**: DTO `@Min/@Max`, DB CHECK, entity INTEGER.

**Customer name**: tạm client-supplied. **TODO Phase F**: lấy từ JWT principal (`JwtAuthenticationToken.getName()`).

**Security**: thêm rule `DELETE /vets/*/ratings/** → STAFF|ADMIN`.

**Test**: 13 IT — validation 0/6, distribution, top-rated ordering AVG DESC + tiebreak COUNT DESC, limit bounds.

---

## Phase E — Photo + Album + Badge

### E1 — Badges (`52891c2`, `94b3fc8`)

**Scope**: Achievement badge (metadata only, không image bytes).

**Enum**: `BadgeTitle` (ROOKIE, EXPERIENCED, MASTER, SURGERY_EXPERT, RESEARCH_AWARD, TOP_RATED) impl IdentifiedEnum.

**DB**: `vets.badges` (id, vet_id FK CASCADE, title VARCHAR(30), awarded_date DATE, description TEXT, audit) + index vet_id. KHÔNG unique — 1 vet nhận cùng badge nhiều lần OK (kỷ niệm năm).

**Endpoints** (`/api/v1/vets/{vetId}/badges`):
- `GET` (paginated), `POST` (201+Location), `DELETE /{badgeId}` (204)
- KHÔNG PATCH — badge immutable
- `awardedDate > today` → 400 `error.date-future`

**Security**: thêm rule `DELETE /vets/*/badges/** → STAFF|ADMIN`.

**Test**: 10 IT (`BadgeControllerIT`) — empty list, vet 404, list multiple, add valid 201+Location, future date 400 `error.date-future`, vetNotFound 404, invalid enum 400, same badge multiple times allowed, delete 204, delete wrong vetId 404.

### E2 — Photo + Album (`5942050`, `8aaa67b`)

**Scope**: Avatar 1-1 + Album gallery 1-N. Binary ở MinIO, metadata ở Postgres.

**Decision chốt**:
- **1 bucket `avatars`** với prefix:
  - `vets/photo/<vetId>` — avatar, overwrite khi re-upload (idempotent)
  - `vets/album/<vetId>/<photoId>` — gallery item
- **Presigned URL** cho GET (TTL 1h config qua `petclinic.storage.minio.presigned-ttl`)
- **10MB max** + content-type whitelist `image/{jpeg,png,webp}` (GIF intentionally bỏ)

**Dependency mới** (`libs.versions.toml`):
- `awsSdk = "2.30.21"` + `aws-sdk-s3` (universal S3 client — dùng cả MinIO local + AWS S3 prod)
- `testcontainers-minio` (cho IT)

**Storage layer**:
- `StorageProperties` (`petclinic.storage.minio.*`) — record + `@Validated` + `@DefaultValue`
- `MinioConfig` — `@Bean S3Client + S3Presigner` với `pathStyleAccessEnabled(true)` (bắt buộc MinIO — subdomain-style không support localhost)
- `StorageService` interface (universal) + `MinioStorageService` impl (AWS SDK v2)

**Entity + DB**:
- Liquibase 009: `vet_photo` (vetId PK + FK 1-1 CASCADE) + `vet_album_photos` (id BIGSERIAL, vet_id FK CASCADE, caption, audit, idx)
- 2 entity extends `AbstractAuditingEntity`
- `MediaValidator` (package-private) share giữa 2 service: validate size + content-type whitelist

**Endpoints**:
- `/api/v1/vets/{vetId}/photo`: `GET` (metadata + presignedUrl) / `PUT` (multipart, overwrite) / `DELETE` (204)
- `/api/v1/vets/{vetId}/album`: `GET` (paginated) / `POST` (multipart + optional `caption` form param, 201+Location) / `DELETE /{photoId}` (204)

**Idempotency rules**:
- Photo: key cố định `vets/photo/<vetId>` → re-upload overwrite cả MinIO + DB upsert
- Album: `saveAndFlush` TRƯỚC để có id auto-gen → key = `vets/album/<vetId>/<id>` → upload MinIO → update entity với key thật
- Delete: MinIO TRƯỚC, DB SAU (retry-safe — nếu MinIO fail thì DB row giữ lại để retry)

**Config**:
- `config-repo/vets-service.yml`: multipart 10MB + `petclinic.storage.minio.*` env-driven (`MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET`)
- `test/resources/application.yml`: dummy storage props cho smoke test (IT override qua `@DynamicPropertySource`)

**Security**: thêm rule `DELETE /vets/*/photo` + `DELETE /vets/*/album/** → STAFF|ADMIN`.

**Test**: 18 IT (9 `VetPhotoControllerIT` + 9 `VetAlbumControllerIT`) với `MinIOContainer` + bucket auto-create `@BeforeEach`.

---

## Hướng dẫn cho dev mới tiếp tục

1. **Resume sau khi pull**: `git pull origin nhat-anh` → `./gradlew :services:vets-service:test` (cần Docker chạy).
2. **Coverage report**: `./gradlew :services:vets-service:jacocoTestReport` → mở `services/vets-service/build/reports/jacoco/test/html/index.html`.
3. **Phase A-E + I + F đã xong toàn bộ** — vets-service nghiệp vụ + security + operational hoàn chỉnh. 76 IT cover.
4. **Optional future phases (chưa lên kế hoạch)** — xem flow chi tiết section "🗺️ Flow next phases" ngay bên dưới.

---

## 🗺️ Flow next phases — dev resume cheat sheet

Mỗi phase ghi 4 mục: **(1) Mục tiêu** — đầu ra business, **(2) Đã có sẵn** — precondition project đã đáp ứng, **(3) Cần thêm** — code/infra/dep phải bổ sung, **(4) Bước làm**.

### Phase G — Publish `vet.rating.added` event

1. **Mục tiêu**: Mỗi khi `POST /api/v1/vets/{vetId}/ratings` thành công, publish event lên RabbitMQ topic exchange `petclinic.events`. Billing/analytics service tương lai sẽ subscribe để tính KPI, gửi notification, v.v.

2. **Đã có sẵn**:
   - `shared/common-events` autoconfig (`EventPublisher` bean, `JacksonJsonMessageConverter`, topology DLX) — xem CLAUDE.md `shared/common-events` section.
   - RabbitMQ container ở `compose.yaml` profile `mq` (`AMQP 5672`, UI `15672`, `guest/guest`).
   - Pattern mẫu: `auth-service` Iter 5 publish `user.registered` (xem `services/auth-service/.../service/impl/AuthServiceImpl.java` chỗ `eventPublisher.publish(...)`).

3. **Cần thêm**:
   - **Dep**: `implementation(project(":shared:common-events"))` trong `services/vets-service/build.gradle.kts`.
   - **DTO event**: `services/vets-service/src/main/java/com/mss301/petclinic/vets/events/VetRatingAddedEvent.java` — record implements `DomainEvent`, payload `{vetId, ratingId, score, customerName, rateDate}`. `routingKey()` = `"vet.rating.added"`.
   - **Inject**: `ObjectProvider<EventPublisher>` vào `RatingServiceImpl` (vì test profile tắt events qua `petclinic.events.enabled=false`).
   - **Publish-after-commit**: dùng `TransactionSynchronizationManager.registerSynchronization(afterCommit(...))` — tránh publish khi transaction rollback (orphan event).
   - **Config**: `config-repo/vets-service.yml` thêm `petclinic.events.enabled: true`, `petclinic.docker.compose.profiles.active: db,mq`. `application-test.yml` đã có `petclinic.events.enabled: false` (kế thừa từ common).
   - **Test**: `@SpringBootTest` với `@TestPropertySource(properties = "petclinic.events.enabled=true")` + `RabbitMQContainer` từ `testcontainers-rabbitmq`. Verify message landed đúng exchange + routingKey + payload. Hoặc đơn giản hơn: inject `EventPublisher` mock, assert call params (unit-style).

4. **Bước làm** (≈ 2-3 giờ):
   1. Add dep vào build.gradle.kts.
   2. Tạo `events/VetRatingAddedEvent.java`.
   3. Sửa `RatingServiceImpl.create(...)`: inject `ObjectProvider<EventPublisher>`, sau `ratingRepository.save(...)` đăng ký `afterCommit` callback publish event.
   4. Update `config-repo/vets-service.yml` thêm events config.
   5. Test IT (Testcontainers RabbitMQ) — verify message published có đầy đủ field.
   6. Commit 2 stage: feat + test. Push.
   7. Update `docs/vets-phases.md` đánh dấu G done.

---

### Phase H — Vet schedule integration với visits-service

1. **Mục tiêu**: Khi `POST /api/v1/visits` (book lịch khám) ở `visits-service`, gọi vets-service kiểm tra vet có rảnh đúng workday × workHour đó không. Nếu vet không rảnh → 409 Conflict. Tránh double-booking.

2. **Đã có sẵn**:
   - **Vets side**: `WorkScheduleSlot` entity + `GET /api/v1/vets/{vetId}/work-schedule` (Phase C). DB query bằng composite PK (vet_id, workday, work_hour).
   - **Visits side**: `services/visits-service` đã consume vets qua `client/VetsClient` (HTTP Interface + RestClient `@LoadBalanced`). Pattern Tolerant Reader.
   - **Cross-service infra**: `shared/common-clients` autoconfig (Builder beans + JwtForwardInterceptor).

3. **Cần thêm**:
   - **Vets side — endpoint mới**: `GET /api/v1/vets/{vetId}/work-schedule/check?workday=MONDAY&workHour=MORNING_9` → `{available: true|false}`. Service query `WorkScheduleSlotRepository.existsById(new WorkScheduleSlotId(vetId, workday, workHour))`. Sub-100ms response.
   - **Visits side — client mở rộng**: trong `visits-service/.../client/VetsClient.java` thêm `@GetExchange("/api/v1/vets/{vetId}/work-schedule/check") boolean isVetAvailable(@PathVariable Long vetId, @RequestParam Workday workday, @RequestParam WorkHour workHour)`.
   - **Visits side — bookVisit logic**: trong `VisitServiceImpl.bookVisit(...)`, derive (workday, workHour) từ `scheduledAt` (Java `DayOfWeek` → `Workday`, `LocalTime.getHour()` → `WorkHour`), gọi `vetsClient.isVetAvailable(...)`. Nếu false → throw `BadRequestAlertException("Vet không trống khung giờ này", "visit", "vet-unavailable")`.
   - **Resilience**: vets-service down → `@CircuitBreaker` đã có ở `RemoteClientsFacade` (Phase 8B pattern). Fallback strategy: fail-open (cho book vẫn được, log warning) hay fail-closed (block book)? Mặc định **fail-closed** vì over-booking nguy hiểm hơn cản trở 1 booking.
   - **Test**: IT trong visits-service: stub vets-service via `@MockBean` hoặc Testcontainers wiremock; verify cả 2 path (available → book OK, unavailable → 400). Vets IT: thêm 2 test case cho endpoint check.

4. **Bước làm** (≈ 3-4 giờ):
   1. **Vets-side trước** (vets-service):
      - Thêm method `WorkScheduleService.isAvailable(Long vetId, Workday workday, WorkHour workHour)`.
      - Thêm endpoint `WorkScheduleController.checkVetAvailability(...)`.
      - 2 IT case (available true/false).
      - Commit + push.
   2. **Visits-side sau** (visits-service):
      - Mở rộng `VetsClient` interface.
      - Sửa `VisitServiceImpl.bookVisit` gọi check trước khi save.
      - Sửa `RemoteClientsFacade` thêm `@CircuitBreaker` cho method này (fallback returns `false` — fail-closed).
      - IT verify happy path + conflict path.
      - Commit + push.
   3. Update `docs/vets-phases.md` đánh dấu H done.

   **Lưu ý ordering**: làm vets-side TRƯỚC (deploy độc lập được) — visits-side chờ vets-side merge mới ra. Tránh circular blocker.

---

### Phase J — FE orval regen + UI mới

1. **Mục tiêu**: FE (apps/web) consume 8 sub-resource mới của vets-service (education, work-schedule, ratings, top-rated, badges, photo, album) qua orval-generated TanStack Query hooks. Hiển thị UI ở `/admin/vets/[id]` page.

2. **Đã có sẵn**:
   - **Backend OpenAPI**: tất cả controller có `@Tag` + `@Operation` → springdoc xuất spec đầy đủ. Method name unique cross-service (CLAUDE.md gotcha #23).
   - **Pipeline orval**: `apps/web/scripts/fetch-openapi.ts` merge spec, `pnpm generate:api` xuất hook. Mutator wraps axios `apiClient`.
   - **UI stack**: React 19 + Vite + TanStack Router + shadcn components. Pattern dialog từ Phase 7B Owners CRUD.
   - **Form**: `@tanstack/react-form` + Zod schemas (xem `lib/form/FieldError.tsx`).

3. **Cần thêm**:
   - **Gateway phải chạy** (port 8180) khi `pnpm fetch:openapi` — script gọi `/v3/api-docs/{service}` qua gateway.
   - **Đoạn UI mới**: `apps/web/src/routes/admin.vets.$id.tsx` (tab layout: Info / Education / Schedule / Ratings / Album / Badges). Mỗi tab gọi hook tương ứng từ `lib/api/generated/`.
   - **Upload component**: photo + album cần `<input type="file">` + multipart submit. Reuse hoặc tạo mới `components/MediaUploader.tsx` — drag-drop với preview, validate client-side (10MB, mime image/*).
   - **Multipart hook**: orval-generated hook cho multipart endpoint cần config `bodyType: 'FormData'` trong `orval.config.ts` cho path matching `/photo` + `/album`.
   - **Vietnamese labels**: tạo `features/vets/labels.ts` cho `Workday` (MONDAY → "Thứ Hai"), `WorkHour` (MORNING_9 → "9-10h sáng"), `BadgeTitle` (CERTIFIED_VET → "Bác sĩ thú y có chứng chỉ").
   - **Validation schemas**: `features/vets/schemas.ts` — Zod cho VetForm, RatingForm.

4. **Bước làm** (≈ 4-6 giờ):
   1. Spin up backend stack: `docker compose --profile db --profile storage up -d` + IntelliJ "🐱 Petclinic Apps" compound (config + discovery + gateway + vets).
   2. FE: `cd apps/web && pnpm fetch:openapi && pnpm generate:api` — verify generated/vets/ folder có 8 file mới.
   3. `pnpm typecheck` — không có error là spec đầy đủ.
   4. Tạo `routes/admin.vets.$id.tsx` với 6 tab + skeleton loading state.
   5. Tab Info: GET `/api/v1/vets/{id}` + PATCH form (TanStack Form + Zod). Test bằng MSW hoặc dev API thật.
   6. Tab Education: list + add/delete dialog. Pattern theo Owners CRUD (Phase 7B).
   7. Tab Schedule: 7 day × 12 hour grid checkbox → PUT replace.
   8. Tab Ratings: list + top-rated badge nếu vet trong top 5.
   9. Tab Album: photo grid + uploader. Photo avatar slot riêng (PUT replace).
   10. Tab Badges: card list + add dialog.
   11. Playwright snapshot mỗi tab (`browser_navigate` → `browser_snapshot`) — đảm bảo layout không vỡ.
   12. Commit theo tab (6 commit) để review dễ.
   13. Update `docs/vets-phases.md` đánh dấu J done.

   **Lưu ý**: KHÔNG edit `lib/api/generated/*` — auto-regen sẽ wipe. Helper code (label map, dialog component) đặt cùng feature folder.

---

### Thứ tự đề nghị

```
G (events)      ──→ độc lập, không phụ thuộc service khác → làm trước
H (visits int)  ──→ cần coordinate với visits-service team, làm sau G
J (FE orval)    ──→ làm cuối khi BE ổn định, tránh regen liên tục
```

Nếu chỉ có 1 dev: **G → H → J**. Nếu nhiều dev: **G + J song song** (independent), **H** sau khi G xong (visits-side cần stable contract).

---

**Cross-cutting rule reminder**:
- Mỗi entity mới phải `extends AbstractAuditingEntity` + Liquibase changeset có 4 audit columns.
- Mỗi DTO mới phải là `record` với `from()` / `toEntity()` static method.
- Mỗi exception domain mới phải extend `ResourceNotFoundException` (`shared/common-web`).
- Mỗi controller mới phải khai báo `@Tag` + `@Operation` (springdoc) + method name unique cross-service.
- Sau khi thêm DELETE trên sub-resource mới, **luôn** thêm rule cụ thể `DELETE /api/v1/vets/*/<sub>/** → STAFF|ADMIN` TRƯỚC rule generic `DELETE /api/v1/vets/** → ADMIN` trong `VetsSecurityConfig` (Spring Security pattern order matter).

**File cần xem trước khi code phase mới**:
- `shared/common-jpa/.../AbstractAuditingEntity.java` — base entity
- `shared/common-web/.../BadRequestAlertException.java` — 400 với header `X-PetClinic-Alert`
- `shared/common-web/.../ResourceNotFoundException.java` — base 404
- `services/vets-service/.../config/VetsSecurityConfig.java` — security rule matrix
- `services/vets-service/.../db/changelog/db.changelog-master.yaml` — Liquibase ordering
- Phase tương tự gần nhất (vd làm E2 → tham khảo E1 + B).
