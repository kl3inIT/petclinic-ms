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
| **E2** | Photo + Album (cần MinIO + multipart) | ⏸️ Blocked — chờ user xác nhận setup | — | — |

**Tổng test hiện tại**: 51 IT pass (1 smoke + 8 Vet + 10 Education + 9 WorkSchedule + 13 Rating + 10 Badge).

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

### E2 — Photo + Album (BLOCKED — chờ user xác nhận setup MinIO)

**Scope**: Avatar (1-1) + Album gallery (1-N) với binary lưu MinIO.

**Pre-requisite (cần user xác nhận)**:
1. Start MinIO: `docker compose --profile storage up -d` (đã có sẵn trong `compose.yaml`, bucket `avatars` + `pet-photos` pre-create với `minioadmin/minioadmin`).
2. Thêm dependency vào `libs.versions.toml` + `services/vets-service/build.gradle.kts`:
   - `software.amazon.awssdk:s3` (S3 client universal — dùng được cả MinIO + AWS S3)

**Decision chưa chốt** (sẽ hỏi user khi tới):
- Bucket: 1 bucket `avatars` dùng prefix (`vets/photo/`, `vets/album/`) HAY 2 bucket riêng?
- GET photo: trả presigned URL (FE fetch trực tiếp MinIO, nhẹ BE) HAY proxy stream qua BE (đơn giản FE, nặng BE)?
- Validate: kích thước tối đa (5MB?), content-type whitelist (image/jpeg|png|webp)?

**Skeleton dự kiến**:
- `model/VetPhoto.java` (vet_id PK, object_key, content_type, size_bytes, uploaded_at) — 1-1 với vet
- `model/VetAlbumPhoto.java` (id BIGSERIAL, vet_id FK, caption, object_key, content_type, size_bytes, audit) — 1-N
- `service/StorageService.java` interface + `MinioStorageService.java` impl (S3 SDK v2)
- Endpoints:
  - `PUT /api/v1/vets/{vetId}/photo` (multipart) / `GET` / `DELETE`
  - `GET /api/v1/vets/{vetId}/album` / `POST` (multipart) / `DELETE /{photoId}`
- Test: dùng MinioContainer Testcontainers thay vì real MinIO

---

## Hướng dẫn cho dev mới tiếp tục

1. **Resume sau khi pull**: `git pull origin nhat-anh` → `./gradlew :services:vets-service:test` (cần Docker chạy).
2. **Coverage report**: `./gradlew :services:vets-service:jacocoTestReport` → mở `services/vets-service/build/reports/jacoco/test/html/index.html`.
3. **Bước tiếp theo IMMEDIATE**: Phase E2 (Photo + Album) — chờ user xác nhận setup MinIO + trả lời 3 decision ở section E2 trước khi viết code.
4. **Optional future phases (chưa lên kế hoạch)**:
   - Phase F: Customer-name từ JWT principal (thay vì client body) — refactor RatingController.
   - Phase G: Publish `vet.rating.added` event qua `shared/common-events` (cho billing/analytics consume sau).
   - Phase H: Workday × WorkHour integration với visits-service (check vet rảnh trước khi đặt visit).

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
