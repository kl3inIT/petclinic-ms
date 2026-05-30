# reviews-service — Business Spec (LOCKED)

> Locked spec sau khi research `D:\Coursera\Summer2026\MSS133\Project\nghiepvu\champlain_petclinic` (visits-Review, products-Rating, vet-Rating). 7 ngày code.
> Port: **8189** (app) / **9189** (mgmt) — 8188/9188 đã bị genai-service chiếm.
> File này = **WHAT** (chốt nghiệp vụ). Flow code chi tiết = `reviews-phases.md` (WHEN/HOW).

---

## 1. Research summary — Champlain có gì

| Nguồn | Storage | Schema | Endpoint | Đặc điểm |
|---|---|---|---|---|
| `visits-service-new` Review | MongoDB | id, ownerId, reviewId, rating int, reviewerName (free), review text, dateSubmitted | GET all / GET id / POST / PUT / DELETE | Owner-level (KHÔNG gắn visit), không eligibility, profanity check **chỉ ở FE** |
| `products-service` Rating | MongoDB | id, productId, customerId, rating Byte, review | GET by product / GET by customer / POST / PUT / DELETE | **UNIQUE (productId, customerId)** — 1 customer 1 rating/product. Identity composite |
| `vet-service` Rating | MongoDB | ratingId, vetId, rateScore Double, rateDescription, predefinedDescription enum {POOR,GOOD,EXCELLENT,AVERAGE}, rateDate, customerName | list/count/avg/percentages/by-date + POST/PUT/DELETE | rateScore Double cho phép 4.5 ⭐; có enum mô tả phụ; có endpoint thống kê (percentages) |
| FE (cả 3) | — | — | — | Profanity filter `bad-words` npm (LONG ≥4 chars substring, SHORT ≤3 word-boundary), leetspeak conversion `@→a, 0→o, 1→i, 3→e, 5→s, 7→t, 8→b`, deaccent NFKD |

**3 thứ tốt từ Champlain — adopt**:
1. **UNIQUE (authorId, targetType, targetId)** từ products → chống spam (1 user chỉ 1 review/target).
2. **Endpoint stats** từ vets → `/summary` (count + avg + distribution) + `/percentages` rút gọn.
3. **Leetspeak + deaccent** từ FE → port sang BE (mạnh hơn regex thuần).

**3 thứ bỏ — không adopt**:
1. ❌ `predefinedDescription` enum của vets → redundant với rating 1-5, FE tự map nếu cần.
2. ❌ `rateScore` Double → giữ `int 1-5` (FE 5 ⭐, đơn giản, đỡ rounding).
3. ❌ `reviewerName` free string → snapshot từ JWT (chống user nhập tên giả).

---

## 2. Quyết định kiến trúc — LOCKED

| # | Quyết định | Nguồn / Lý do |
|---|---|---|
| K1 | **1 service polymorphic** (targetType: VET / PRODUCT / VISIT) | Project sketch + DRY (Champlain duplicate 3 lần) |
| K2 | **Postgres + JPA + Liquibase** (KHÔNG MongoDB) | CLAUDE.md hard rule |
| K3 | **author = JWT** (authorId UUID + authorName snapshot từ claim `username`) | Chống user giả mạo (Champlain để FE tự gửi `reviewerName`) |
| K4 | **UNIQUE (authorId, targetType, targetId)** | Adopt từ products-Rating |
| K5 | **Eligibility check VET/VISIT** → REST gọi `VisitsClient` check `Visit.status=COMPLETED` + `customerUserId=authorId` | Project rule (Champlain không có) |
| K6 | **Eligibility PRODUCT** → SKIP v1 (chưa có billing-service) | Pragmatic |
| K7 | **Moderation BE** = regex profanity + leetspeak + deaccent (port từ FE Champlain `ReviewProfanity.ts`) | Spec project (Champlain chỉ làm FE → bypass dễ) |
| K8 | **Hit profanity → status PENDING_MODERATION** (không reject) | Cho admin xét — không mất nội dung |
| K9 | **Edit window 7 ngày** từ `created_date` audit | Spec project |
| K10 | **Vote helpful/not-helpful** với UNIQUE(reviewId, userId), denorm `helpful_count` | Added value (Champlain không có) |
| K11 | **Soft delete** (status=DELETED, không xóa row) | Audit + dispute |
| K12 | **Publish event `review.created`** qua RabbitMQ | Spec project |
| K13 | **Skip event `review.voted`** v1 | YAGNI |
| K14 | **Self-vote forbidden** (author không vote chính review của mình) | Anti-gaming |
| K15 | **Star rating = int 1-5** (CHECK constraint + `@Min(1) @Max(5)`) | DB + DTO defense-in-depth |
| K16 | **Public read** (GET không cần auth) | UX — khách xem được review không cần login |

---

## 3. Aggregate (FINAL schema)

```
Review {
  id            BIGINT PK (BIGSERIAL)
  target_type   VARCHAR(20)  NOT NULL    [VET | PRODUCT | VISIT]
  target_id     UUID         NOT NULL    -- ref Vet.id / Product.id / Visit.id (UUID hoặc Long-string)
  author_id     UUID         NOT NULL    -- JWT sub
  author_name   VARCHAR(120) NOT NULL    -- snapshot from JWT claim "username"
  rating        INT          NOT NULL    -- CHECK 1..5
  title         VARCHAR(120) NOT NULL    -- @NotBlank, @Size(max=120)
  comment       TEXT         NOT NULL    -- @NotBlank, @Size(max=2000)
  status        VARCHAR(30)  NOT NULL    [PUBLISHED | PENDING_MODERATION | FLAGGED | HIDDEN | DELETED]
  helpful_count INT          NOT NULL DEFAULT 0   -- denorm từ review_votes WHERE vote_type=HELPFUL
  version       BIGINT                    -- optimistic locking
  + 4 audit columns (created_by, created_date, last_modified_by, last_modified_date)

  UNIQUE (author_id, target_type, target_id)
  INDEX (target_type, target_id, status)   -- list filter
  INDEX (author_id)                         -- "my reviews"
  INDEX (status)                            -- moderation queue
}

ReviewVote {
  id         BIGINT PK
  review_id  BIGINT FK → reviews(id) ON DELETE CASCADE
  user_id    UUID NOT NULL
  vote_type  VARCHAR(15) NOT NULL  [HELPFUL | NOT_HELPFUL]
  + 4 audit columns

  UNIQUE (review_id, user_id)
}
```

**Lưu ý FK polymorphic**: `target_id` KHÔNG khai DB-level FK (vì 3 bảng đích ở 3 schema khác). Cleanup orphan = job định kỳ (skip v1).

---

## 4. State machine — ReviewStatus

```
                           ┌──── approve ────┐
                           │                 ▼
PUBLISHED ──hide──▶ HIDDEN   ◀─unhide   PUBLISHED
   │ ▲                                  ▲
   │ │                                  │
   │ └────────── approve ─── PENDING_MODERATION (sau moderate profanity)
   │                                ▲
   │                                │ flag-reuse
   │                                │
   └── soft-delete ──▶ DELETED      │
                       (terminal)   │
                                  FLAGGED ── user report (skip v1)
```

| From → To | Trigger | Ai làm |
|---|---|---|
| (new) → PUBLISHED | POST review, moderation pass | USER |
| (new) → PENDING_MODERATION | POST review, moderation hit profanity | USER (auto) |
| PENDING_MODERATION → PUBLISHED | Admin approve | STAFF/ADMIN |
| PENDING_MODERATION → HIDDEN | Admin hide | STAFF/ADMIN |
| PUBLISHED → HIDDEN | Admin hide (sau khi user complain) | STAFF/ADMIN |
| HIDDEN → PUBLISHED | Admin unhide | ADMIN |
| PUBLISHED → DELETED | User self-soft-delete | USER (own) |
| any → DELETED | Admin hard-moderate | ADMIN |

FLAGGED reserved cho user-report feature (skip v1).

---

## 5. Endpoints — FINAL

### Public / USER
| Method | Path | Auth | Method name (operationId) |
|---|---|---|---|
| POST | `/api/v1/reviews` | USER | `createReview` |
| GET | `/api/v1/reviews` | public | `searchReviews` (filter `targetType`, `targetId`, `minRating`, `status` default PUBLISHED, pageable) |
| GET | `/api/v1/reviews/{id}` | public | `getReview` |
| PATCH | `/api/v1/reviews/{id}` | USER own + edit-window | `updateReview` |
| DELETE | `/api/v1/reviews/{id}` | USER own | `deleteReview` (soft) |
| POST | `/api/v1/reviews/{id}/vote` | USER (not self) | `voteReview` |
| GET | `/api/v1/reviews/summary` | public | `getReviewsSummary` — `?targetType=&targetId=` → `{count, average, distribution{1..5}}` |
| GET | `/api/v1/reviews/me` | USER | `listMyReviews` — review của chính mình (paginated, mọi status) |

### Admin
| Method | Path | Auth | Method name |
|---|---|---|---|
| GET | `/api/v1/admin/reviews` | STAFF/ADMIN | `listPendingReviews` — `?status=PENDING_MODERATION` default |
| PATCH | `/api/v1/admin/reviews/{id}/approve` | STAFF/ADMIN | `approveReview` |
| PATCH | `/api/v1/admin/reviews/{id}/hide` | STAFF/ADMIN | `hideReview` — body `{reason}` |
| PATCH | `/api/v1/admin/reviews/{id}/unhide` | ADMIN | `unhideReview` |
| DELETE | `/api/v1/admin/reviews/{id}` | ADMIN | `adminDeleteReview` (hard delete) |

---

## 6. Validation rules

| Field | Rule | Error code |
|---|---|---|
| `targetType` | NOT NULL, ∈ {VET, PRODUCT, VISIT} | 400 ProblemDetail Jackson |
| `targetId` | NOT NULL, UUID format | 400 |
| `rating` | NOT NULL, 1 ≤ x ≤ 5 (INT) | 400 (DTO `@Min/@Max` + DB CHECK) |
| `title` | NOT BLANK, ≤ 120 chars | 400 |
| `comment` | NOT BLANK, ≤ 2000 chars | 400 |
| UNIQUE (author, target) | violate → upsert? **NO** → 400 `error.review-already-exists` | 400 |
| Eligibility VET/VISIT | `VisitsClient.findById(targetId).status=COMPLETED && customerUserId=authorId` | 400 `error.eligibility` |
| Self-vote | `review.authorId == currentUserId` | 400 `error.self-vote-forbidden` |
| Edit window | `now - created_date > 7d` | 400 `error.edit-window-expired` |
| Edit/Delete ownership | `review.authorId != currentUserId` | 404 (path-tamper) |
| Moderation pipeline | profanity hit → status=PENDING_MODERATION (KHÔNG reject) | — |

---

## 7. Moderation algorithm (port từ FE Champlain)

```
Input: title + " " + comment
Steps:
  1. deaccent: NFKD normalize, strip combining marks (é → e)
  2. lowercase
  3. leetspeak: @→a, 0→o, 4→a, 1!→i, 3→e, 5$→s, 7→t, 8→b
  4. flatLetters = leet(deaccent(input)).replace(/[^a-z]/, '')
  5. boundaryText = leet(deaccent(input))
  6. Match:
     - LONG words (≥4 chars) → flat.contains(word)
     - SHORT words (≤3 chars) → boundaryText.match(/(?<![a-z])word(?![a-z])/i)
  7. ANY hit → return ModerationResult(profane=true)
```

**Word list source**: `src/main/resources/moderation/profanity.txt` (1 từ / dòng, lowercase). Khoảng 30-50 từ tiếng Anh + tiếng Việt phổ biến.

**Interface** = `ContentModerator.check(title, comment) → ModerationResult{ profane, hitWords[] }`. Impl `RegexProfanityModerator @Service`. Swap được sang `OpenAiModerationClient` sau (gọi `https://api.openai.com/v1/moderations`).

---

## 8. Events

**Publish `review.created`** (RabbitMQ topic exchange `petclinic.events`, routing key `review.created`):
```json
{
  "eventId":   "uuid",
  "eventType": "review.created",
  "occurredAt": "ISO-8601",
  "source":    "reviews-service",
  "reviewId":  123,
  "targetType":"VET",
  "targetId":  "uuid",
  "authorId":  "uuid",
  "rating":    5,
  "status":    "PUBLISHED"
}
```

Consumer tương lai:
- `mailer-service` (Go) → email "review của bạn đã đăng"
- `vets-service` / `products-service` → bust cache "top-rated"
- Skip v1.

---

## 9. 7-day timeline

| Ngày | Wave | Output | Verify |
|---|---|---|---|
| **D1 (Mon)** | W1 + W2 | Skeleton infra + DB schema apply | `bootRun` UP + `\dt reviews.*` |
| **D2 (Tue)** | W3 (domain) | Enum + Review/ReviewVote entity + exception + ContentModerator + profanity.txt | Compile pass + 1 unit test moderator |
| **D3 (Wed)** | W4 + W5 | Repo + Specifications + VisitsClient + Facade CB + DTOs | Boot + circuit breaker registry log |
| **D4 (Thu)** | W6 | ReviewServiceImpl (full 12 method) | Compile + mock test 3 happy path |
| **D5 (Fri)** | W7 + W8 | Event publish + 2 controller + SecurityConfig | curl POST/GET/PATCH manual với JWT |
| **D6 (Sat)** | W9 + W10 partial | Dockerfile + run config + compose + smoke test | `docker compose --profile apps up` + Swagger gateway dropdown |
| **D7 (Sun)** | W10 full + buffer | E2E test 12 checkpoint + fix bug + commit + push + cập nhật `reviews-phases.md` status table | RabbitMQ UI thấy event, smoke test all pass |

**Buffer**: D7 chiều để buffer (UAT edge case, fix bug, refactor). Nếu kẹt:
- Cắt: vote feature → D7 nếu hết giờ.
- Cắt: admin unhide/hard-delete → push v2.
- Cắt: `/me` endpoint → push v2.

**Daily commit cadence**: mỗi wave xong → 1 commit + push. Mỗi commit message prefix `feat(reviews): Wx — ...`.

---

## 10. Out of scope v1 (push v2 / future)

- ❌ User-report (FLAGGED status flow)
- ❌ Event `review.voted`
- ❌ Polymorphic FK cleanup job (vd Visit bị xóa thì review treo)
- ❌ Image attachment trên review (Champlain cũng không có)
- ❌ Reply to review (vet trả lời customer)
- ❌ Helpful count cache trong target service (vd vets-service show "5 reviews, avg 4.2")
- ❌ PRODUCT eligibility (chờ billing-service)
- ❌ AI moderation (OpenAI moderation API) — interface đã sẵn sàng, impl sau
- ❌ FE — Iter 1 chỉ BE, FE để Iter 2

---

## 11. Definition of Done — D7 cuối ngày

- [ ] `docker compose --profile all --profile apps up -d` chạy được full stack (12 service: reviews-service trong đó)
- [ ] Swagger gateway `http://localhost:8180/swagger-ui.html` thấy `reviews-service` trong dropdown
- [ ] Smoke test 12 checkpoint trong `reviews-phases.md` W10 pass hết
- [ ] RabbitMQ UI `localhost:15672` thấy message routing key `review.created`
- [ ] JetBrains `get_file_problems` zero error trên tất cả YAML
- [ ] `reviews-phases.md` 10 wave status đều ✅ với SHA commit
- [ ] Push branch `nhat-anh` lên remote
- [ ] Cập nhật `docs/business-flow.html` thêm dòng "Reviews-service: DONE" (nếu file có roadmap section)

---

## 12. Tham chiếu chéo

- Codebase hiện tại: `docs/reviews-service.html` (sketch ban đầu, KHÔNG còn dùng nguyên văn — đã refine ở file này)
- Flow code chi tiết: `docs/reviews-phases.md`
- Pattern code copy từ: `services/visits-service/` (security + client + domain), `services/vets-service/` (Liquibase + Specification + sub-resource)
- Gotcha cần đọc lại: CLAUDE.md #14 (RestClient), #16 (EnumSet), #17 (JPQL NULL), #22 (ObjectProvider), #23 (operationId), #28 (CB self-invocation)
- Spec gốc Champlain: `D:\Coursera\Summer2026\MSS133\Project\nghiepvu\champlain_petclinic\{visits-service-new, products-service, vet-service}` (read-only)
