# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

`petclinic-ms` is a learning microservices project for MSS301 (Champlain college course). The project is a **deliberate composition of three sources**:

| Source | What we take | What we ignore |
|---|---|---|
| **Spring official `spring-petclinic-microservices`** | Architecture: Spring Cloud (Eureka discovery, Config Server, Cloud Gateway, Resilience4j circuit breaker), observability (Micrometer, Prometheus, Grafana, Tempo, Spring Boot Admin), Spring AI for chatbot service, Testcontainers. **The "how" of microservices.** | Limited domain — official only has 3 services (customers, vets, visits). Too thin for a real-world example. |
| **Champlain `champlain_petclinic`** | Business domain breadth: `customers`, `vets`, `visits`, `auth`, `billing`, `products`, `cart`, `inventory`, `mailer`, `files`, plus dual frontend (React + Angular). **The "what" — the domain map and feature set.** | Old Boot 3.1.3 stack, no Spring Cloud, MongoDB-by-default, build script duplicated per service, no version catalog, no convention plugins. Outdated infrastructure. |
| **2026 best practices (added by this project)** | Java 25 + virtual threads, Spring Boot 4.0.6, Spring Cloud 2025.1.1 Oakwood, Gradle 9.5 Kotlin DSL + convention plugins + version catalog, JHipster-style `ExceptionTranslator`, `ProblemDetail` RFC 9457, Postgres-first (schema-per-service), Liquibase, Testcontainers, springdoc, structured logging, Micrometer Tracing. | n/a — this is where the project diverges from both references. |

**Decision rule when patterns conflict:** Spring official wins on infrastructure (Cloud, observability, AI, build tooling); Champlain wins on domain (which services to build, what fields the entities have); 2026 best practices win on versions and code style. Never copy Champlain's build scripts, MongoDB usage, or per-service plugin declarations.

Reference repos live outside this directory and are read-only:
- `../champlain_petclinic` — domain/feature reference only
- `../../spring-ecommerce-ai-microservices` — secondary reference for modern package layout (`controller`/`dto`/`exception`/`model`/`repository`/`service/impl`)
- Spring official's `spring-petclinic-microservices` — read via GitHub when needed; not cloned locally

## Stack (verified May 2026, do not downgrade)

| | Version | Notes |
|---|---|---|
| Java | **25** (Temurin LTS) | virtual threads enabled |
| Gradle | **9.5.0** + Kotlin DSL | wrapper committed |
| Spring Boot | **4.0.6** | latest stable |
| Spring Cloud | **2025.1.1 Oakwood** | 2025.0.x is **NOT** compatible with Boot 4.0.x |
| PostgreSQL | **18.4-alpine** | mounted at `/var/lib/postgresql` (parent, NOT `/data`) |
| springdoc-openapi | **3.0.3** | dedicated branch for Boot 4 |
| Testcontainers | **2.0.5** | artifactId changed to `testcontainers-*` in April 2026 |

## Build, run, test

```bash
# Run a service (auto-starts Postgres via Spring Boot Docker Compose support)
./gradlew :services:customers-service:bootRun

# Run tests for one service (uses Testcontainers — Docker required)
./gradlew :services:customers-service:test

# Build everything
./gradlew build

# Coverage report (HTML at services/<name>/build/reports/jacoco/test/html/index.html)
./gradlew :services:customers-service:jacocoTestReport

# Spin up Postgres standalone (without running any service)
docker compose --profile db up -d

# Spin up full event-driven stack (Postgres + RabbitMQ + Redis + Mailpit + MinIO)
docker compose --profile all up -d

# Run the Go mailer-service (NOT a Gradle module — see gotcha #21)
cd services/mailer-service && go run ./cmd/mailer

# Frontend dev (Vite on :3333 → proxies /api to gateway :8180)
cd apps/web && pnpm dev

# Regenerate API client after BE changes (requires gateway running)
cd apps/web && pnpm fetch:openapi && pnpm generate:api
```

In IntelliJ, prefer the committed run configs in `.run/`:
- `customers-service` — Spring Boot type, WORKING_DIRECTORY=$PROJECT_DIR$ (required so `spring.docker.compose.file: compose.yaml` resolves)
- `customers-service [bootRun]` — Gradle alternative
- `all-services` — Compound config; add new services as inner `<toRun>` entries

## Architecture

### Build organization

- `gradle/libs.versions.toml` — **single source of truth** for every dependency version. Never pin versions in service `build.gradle.kts`.
- `build-logic/` — included build with three convention plugins:
  - `petclinic.java-conventions` — Java 25 toolchain, JUnit 5 BOM, JaCoCo, UTF-8, `-parameters`
  - `petclinic.spring-boot-service` — applies java-conventions + Spring Boot plugin + dep-management + Spring Cloud BOM + Actuator + `buildInfo()` + sets `bootRun.workingDir = rootDir`
  - `petclinic.shared-library` — applies java-conventions + `java-library` + dep-management + Spring Boot BOM. For modules under `shared/` (NOT Spring Boot apps — no `bootJar`).
- `shared/<name>/build.gradle.kts` — apply `id("petclinic.shared-library")` plus deps (mostly `compileOnly` so services bring runtime).
- `services/<name>/build.gradle.kts` — must stay short, only `id("petclinic.spring-boot-service")` + `implementation(project(":shared:common-web"))` + `implementation(project(":shared:common-jpa"))` + service-specific deps. Never re-declare Spring Boot/Cloud versions here.
- `compose.yaml` — root-level dev infra; uses profiles (`db`, future: `cache`, `messaging`) so each service only starts what it needs

### Shared modules (Spring Boot auto-config — no copy-paste between services)

Cross-cutting code lives in `shared/`. Services depend via `implementation(project(":shared:<name>"))` — beans wire automatically via `@AutoConfiguration`. **Never re-create these in a service.**

- **`shared/common-web`** — REST/MVC layer cross-cutting:
  - `ExceptionTranslator` (`@RestControllerAdvice` + `@Order(HIGHEST_PRECEDENCE)`, does NOT extend `ResponseEntityExceptionHandler`) — RFC 9457 ProblemDetail. Direct `@ExceptionHandler` methods for domain (`ResourceNotFoundException`, `BadRequestAlertException`), concurrency, and validation (`MethodArgumentNotValidException` → `fieldErrors[]`). Spring Boot 4's `spring.mvc.problemdetails.enabled=true` auto-handles built-in exceptions (404/405/415) as ProblemDetail — extending parent class causes ambiguous mapping. Handles base `ResourceNotFoundException` — catches every subclass automatically.
  - `ResourceNotFoundException` (abstract) — services subclass: `class OwnerNotFoundException extends ResourceNotFoundException { OwnerNotFoundException(String id) { super("Owner", id); } }`.
  - `BadRequestAlertException` — throw directly for business validation. Response includes `X-PetClinic-Alert` header.
  - `ErrorConstants` — URI type constants for ProblemDetail.
  - `PetClinicOpenApiCustomizer` — auto-populates OpenAPI info from `spring.application.name`. Service can override by declaring its own `@Bean OpenAPI`.

- **`shared/common-jpa`** — JPA layer cross-cutting:
  - `AbstractAuditingEntity` (`@MappedSuperclass + @EntityListeners(AuditingEntityListener)`) — provides `created_by`, `created_date`, `last_modified_by`, `last_modified_date`. Entities extend this. Liquibase changeset must add the four columns to each table.
  - `SystemAuditorAware` — default `AuditorAware<String>` returning `"system"`. Services with Spring Security override by declaring their own bean.
  - `IdentifiedEnum` — interface for enums needing stable persistence ID + i18n key. `id()` is the contract with DB/FE; override it when renaming `name()` to keep DB compatibility. `labelKey()` uses `getDeclaringClass()` (not `getClass()`) to avoid the anonymous-subclass-when-enum-has-body bug.
  - `OrderedEnum` extends `IdentifiedEnum` — adds `weight()`. Convention: use gaps (10/20/30) so future inserts don't break forward-only invariants on persisted higher-weight values.
  - `IdentifiedEnums` — `byId`, `findById`, `sortedByWeight` utility methods.

- **`shared/common-clients`** — service-to-service HTTP infrastructure (since Phase 5A):
  - `JwtForwardInterceptor` — reads `JwtAuthenticationToken` from `SecurityContextHolder` and forwards the Bearer token to downstream calls. Downstream STILL validates JWT independently via `common-security` (defense-in-depth).
  - `defaultRestClientBuilder` — plain `RestClient.Builder` marked `@Primary`. **CRITICAL: this bean must exist** — Eureka 2.x autowires `ObjectProvider<RestClient.Builder>` without qualifier to call its own server. If only the `@LoadBalanced` builder exists, Eureka picks it up → LoadBalancer tries to resolve `localhost` as a service name → `No instances available for localhost`. Always ship BOTH builders.
  - `loadBalancedRestClientBuilder` — `@LoadBalanced` builder pre-wired with `JwtForwardInterceptor`. Consumers inject with `@LoadBalanced RestClient.Builder` qualifier to opt into LB.
  - Service consumes by declaring local `@HttpExchange` interface + `@Bean` factory cloning the LB builder with `baseUrl("http://<service-name>")`. See `services/visits-service/src/main/java/com/mss301/petclinic/visits/client/`. **Pattern: client + DTO records live in the CONSUMER service (Tolerant Reader), not in shared/ — downstream service can evolve API without breaking consumers.**

- **`shared/common-events`** — async event infrastructure over RabbitMQ:
  - `DomainEvent` — interface contract (`eventId`, `eventType`, `occurredAt`, `source`, `routingKey()` default = eventType). Publisher service declares concrete records implementing it under its own `events/` package.
  - `EventPublisher` — thin wrapper over `RabbitTemplate.convertAndSend(exchange, routingKey, event)`. Service injects this, never touches RabbitTemplate directly.
  - `EventsProperties` (`petclinic.events.*`) — exchange name (default `petclinic.events` topic), DLX name (`petclinic.events.dlx`), `enabled` flag (set `false` in `application-test.yml`).
  - `EventQueues.consumer(queueName, routingKey, props)` — returns `Declarables` with main queue (durable, `x-dead-letter-exchange` arg) + DLQ + bindings. **Per-service per-event-type queue** (vd `billing.visit.completed` + `billing.visit.completed.dlq`) for isolated retry/debug.
  - Uses `JacksonJsonMessageConverter` (Jackson 3 — Boot 4 default; `Jackson2JsonMessageConverter` is deprecated for removal). **Default TypePrecedence = INFERRED** in Spring AMQP 4 → concrete listener param type wins over `__TypeId__` header, enabling cross-language consume (Go publisher without `__TypeId__`).
  - **Tolerant Reader on consumer:** consumer redeclares its own DTO record (NOT importing the publisher's event class). Jackson silently ignores fields the consumer doesn't model.
  - **Idempotency:** publisher does NOT guarantee exactly-once. Consumer must dedupe by `eventId` (UUID) — recommend a `processed_events` table with unique constraint, check inside the same `@Transactional` boundary as the side effect.
  - **Saga primitives (Phase 14, added 2026-05):** `saga/SagaStatus` enum (`PENDING`/`COMPLETED`/`COMPENSATED`) + generic envelopes `saga/NotificationAck` and `saga/NotificationFailed` for choreography saga ACK/failure events from any notifier. Routing key convention `<domain>.notification.<ack|failed>` (vd `visit.notification.ack`). Domain-specific entity + handler stays in the service initiator (vd `visits-service/saga/NotificationSaga` + `NotificationSagaHandler`).

- **Saga pattern (choreography, Phase 14)** — `visits-service` is the canonical reference:
  - Initiator publishes domain event (`VisitCompletedEvent`) + creates `NotificationSaga` row (status `PENDING`, indexed by `event_id` unique) inside the same `@Transactional` boundary as the business state change.
  - Notifier (Go `mailer-service`) processes + publishes generic `NotificationAck` / `NotificationFailed` envelope with `originalEventId` = publisher's event UUID for correlation.
  - Initiator `@RabbitListener` updates saga row to `COMPLETED` (ack) or `COMPENSATED` (failed) + publishes domain-specific compensating event (`VisitManualFollowUpRequiredEvent`). Compensation is a real business action, not DB rollback.
  - **Idempotency:** `markCompleted()` / `markCompensated()` no-op when `status != PENDING` → safe for broker redeliver.
  - **Constraints documented in code:** publish + DB commit is NOT atomic (dual-write problem); production needs Transactional Outbox (event row in same TX + separate poller publishes to broker). See `microservices.io/patterns/data/transactional-outbox`.
  - **Choreography ceiling ≤ 4-5 steps**; beyond that switch to orchestration (Temporal / Eventuate Tram / Camunda).

**Auto-config descriptor:** Each shared module ships `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` (Spring Boot 3+ replacement for legacy `spring.factories`). All beans use `@ConditionalOnMissingBean` so services can override.

**Rule: cross-cutting yes, domain no.** Never put entities, repositories, or business services in `shared/`. Each service owns its domain.

### Service package structure (mandatory)

```
com.mss301.petclinic.<service>/
├── <Service>Application.java
├── config/                  — @Configuration classes (service-specific only — shared OpenAPI handled by common-web)
├── controller/              — @RestController, returns Page<>/ResponseEntity/DTO
├── service/                 — interface
│   └── impl/                — @Service + @Transactional implementation
├── repository/              — JpaRepository
├── model/                   — JPA entity (plain class, extends AbstractAuditingEntity)
├── dto/
│   ├── req/                 — request records with @NotBlank etc., `toEntity()` instance method
│   └── res/                 — response records, `from(Entity)` static method
└── exception/               — domain-specific subclasses ONLY (<Entity>NotFoundException extends ResourceNotFoundException). ExceptionTranslator + ErrorConstants + BadRequestAlertException are in shared/common-web — NEVER duplicate them per service.
```

### Configuration binding pattern

**Use `@ConfigurationProperties` records for any config with more than 1 related key, or when the same key is read by multiple beans. `@Value` only for one-off, single-bean reads.**

Template — two files in a `config/` package:

```java
// AuthProperties.java — immutable record + @DefaultValue cho defaults
@ConfigurationProperties(prefix = "petclinic.auth")
public record AuthProperties(
        @DefaultValue("PT15M") Duration accessTokenTtl,
        @DefaultValue("P7D")   Duration refreshTokenTtl
) {}

// AuthPropertiesConfiguration.java — activator
@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class AuthPropertiesConfiguration {}
```

Inject + access:
```java
public JwtTokenProvider(JwtEncoder enc, AuthProperties props) {
    this.accessTokenTtl = props.accessTokenTtl();   // record accessor — KHÔNG phải getAccessTokenTtl()
}
```

**Why records:**
- Immutable — config không bị mutate runtime
- Zero boilerplate (no getters/setters)
- Spring Boot 3+ tự pick canonical constructor để bind
- `@DefaultValue` trên parameter — defaults visible inline tại declaration
- IntelliJ autocomplete tốt hơn

**Why split POJO + activator:**
- Record có zero Spring annotations beyond `@ConfigurationProperties` → easy test, easy import từ module khác
- Activator là 1 chỗ rõ ràng "service này bind properties này"
- Avoids circular `@Bean` order issues

**Gradle:** Add `annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")` để IntelliJ show autocomplete + javadoc khi gõ `petclinic.auth.*` trong YAML.

**Shared properties (multiple services):** record ở `shared/common-<x>/jwt/`, activate qua shared module's `@AutoConfiguration` (vd: `@EnableConfigurationProperties(PetClinicJwtProperties.class)` trên `PetClinicSecurityAutoConfiguration`).

**Validation:** thêm `@Validated` trên record + `jakarta.validation` annotations trên parameters (`@NotBlank`, `@DurationMin`, etc.) cho fail-fast startup checks.

**Why we don't use `@Value`:**
- Type-unsafe (string typo → runtime NPE)
- Defaults scattered (`${key:default}`) — hard to grep
- Mixes config with logic
- No IDE autocomplete on key name

### Hard rules (no exceptions)

- **NO Lombok.** Java 25 records cover DTOs; entities write plain getters/setters manually.
- **NO mapper layer.** Conversion lives as static `from()` / `toEntity()` on the record itself. Do NOT add MapStruct/ModelMapper.
- **NO duplicate cross-cutting code.** Anything in `shared/common-web` or `shared/common-jpa` (ExceptionTranslator, ErrorConstants, BadRequestAlertException, AbstractAuditingEntity, OpenApi customizer, IdentifiedEnum, ...) must NEVER be re-defined per service.
- **DTOs are records, entities are classes** — entities extend `AbstractAuditingEntity` from `shared/common-jpa` (4 audit columns wired by Spring Data Auditing).
- **Layered package by feature**, not by type at top level. Inside a service, `controller`/`service`/`repository` are the top-level subpackages.
- **Service interface + impl split** in `service/` + `service/impl/`. Controllers depend on the interface.
- **API versioning** in path: `/api/v1/<resource>`. Never break v1; add v2 alongside.
- **Enums needing DB persistence implement `IdentifiedEnum`** (or `OrderedEnum` for sortable). Use `id()` for DB, never raw `Enum.name()` directly.

### Database strategy

- **Postgres + JPA + Liquibase** is the default for every new service. Do NOT default to MongoDB (the old Champlain repo over-uses Mongo; that is what we are deliberately avoiding).
- Mongo / Neo4j only when the business genuinely needs document flexibility or graph traversal — never for plain CRUD.
- **One Postgres instance, schema-per-service** in dev (`customers`, `vets`, `auth`, …). Each service has `spring.jpa.properties.hibernate.default_schema=<service>`.
- `spring.jpa.hibernate.ddl-auto=validate` always. Liquibase owns the schema.
- **Liquibase tracking tables live in `public`** — do NOT set `spring.liquibase.liquibase-schema` to the service schema. Service schema doesn't exist yet when Liquibase boots, so tracking would fail (chicken-and-egg).
- Changeset 001 creates the service schema with `CREATE SCHEMA IF NOT EXISTS`; subsequent changesets specify `schemaName: <service>` explicitly.
- Every table backed by an entity extending `AbstractAuditingEntity` must have a `00X-add-auditing-columns.yaml` changeset with `created_by VARCHAR(50)`, `created_date TIMESTAMP WITH TIME ZONE`, `last_modified_by VARCHAR(50)`, `last_modified_date TIMESTAMP WITH TIME ZONE`. Spring Data JPA Auditing fills these automatically; `SystemAuditorAware` in `shared/common-jpa` returns `"system"` until Spring Security is wired.

### Exception handling (JHipster + Spring Boot 4 native)

- **Lives in `shared/common-web`** — services do NOT define `ExceptionTranslator`/`ErrorConstants`/`BadRequestAlertException` themselves.
- `ExceptionTranslator` is `@RestControllerAdvice` + `@Order(Ordered.HIGHEST_PRECEDENCE)` — does NOT extend `ResponseEntityExceptionHandler`. Spring Boot 4 with `spring.mvc.problemdetails.enabled=true` already converts built-in exceptions (404, 405, 415, `HttpMessageNotReadable`, ...) to `ProblemDetail`; extending parent class causes "Ambiguous @ExceptionHandler method mapped" on `MethodArgumentNotValidException`.
- Direct `@ExceptionHandler` methods for: domain `ResourceNotFoundException` (catches every subclass), `BadRequestAlertException`, `ConcurrencyFailureException`, `MethodArgumentNotValidException` (returns `fieldErrors[]` with field/code/message).
- Services only add domain-specific subclasses: `class OwnerNotFoundException extends ResourceNotFoundException { super("Owner", id); }`.
- `BadRequestAlertException` carries `entityName` + `errorKey`. Response includes header `X-PetClinic-Alert` for FE i18n toast without parsing the message string.
- `application.yml`: `spring.mvc.problemdetails.enabled=true` is REQUIRED so Spring auto-handles built-in exceptions.

### Configuration files per service

Config lives in TWO places: local (per-service `application.yml`, minimal) + `config-repo/` at project root (env-split, served by Config Server).

**Local `services/<name>/src/main/resources/application.yml`** — only what MUST be local. Under 20 lines:
- `spring.application.name` (lookup key for Config Server)
- `spring.profiles.active: ${SPRING_PROFILES_ACTIVE:dev}` — default `dev` for local bootRun, overridden by env in CI/prod
- `spring.config.import: optional:configserver:${CONFIG_SERVER_URL:http://localhost:8888}` — `optional:` so app boots when Config Server is down
- `server.port` + `management.server.port`

**`config-repo/` (at project root, served by `config-server` on port 8888) — env-split layout:**

| File | Scope | Examples |
|---|---|---|
| `application.yml` | shared, all envs | virtual threads, problemdetails, eureka instance metadata, springdoc, logging pattern, management exposure |
| `application-dev.yml` | dev only, all services | docker compose support, eureka URL localhost:8761, tracing 100%, plain text logs, `health show-details: when-authorized` |
| `application-test.yml` | test only, all services | docker compose off, `spring.cloud.config.enabled: false`, eureka off, tracing 0% |
| `application-prod.yml` | prod only, all services | docker compose off, structured ECS JSON logs, `health show-details: never`, tracing 0.1, `EUREKA_URL` env-driven (no fallback) |
| `<service>.yml` | service-specific, all envs | JPA `default_schema`, `ddl-auto: validate`, liquibase changelog path |
| `<service>-dev.yml` | service+dev | datasource fallback URL `localhost:5433/petclinic?currentSchema=<svc>` |
| `<service>-prod.yml` | service+prod | datasource env-driven (`DB_URL`/`DB_USER`/`DB_PASSWORD`, no fallback), `format_sql: false`, `org.hibernate.SQL: WARN` |

**Precedence** (high → low) — Spring Cloud Config returns sources in this order, first wins:
1. local `application[-profile].yml`
2. `config-repo/<service>-<profile>.yml`
3. `config-repo/application-<profile>.yml`
4. `config-repo/<service>.yml`
5. `config-repo/application.yml`
6. Spring defaults

**Test resources** (`src/test/resources/application.yml`) — sets `spring.profiles.active: test`, disables Config Client (`spring.cloud.config.enabled: false` + `spring.cloud.config.import-check.enabled: false`), disables docker compose support, keeps Liquibase enabled. Tests are hermetic — no dependency on Config Server or Eureka being up.

**Activating non-dev profiles:**
- Test: `@ActiveProfiles("test")` on test classes (test/resources/application.yml also sets it as fallback)
- Prod: env var `SPRING_PROFILES_ACTIVE=prod` in k8s/Helm/systemd

**Discovery-server and config-server are NOT config clients** — they self-contain their config in local `application.yml`. Boot order: config-server and discovery start independently and in parallel; only domain services (customers, vets, …) depend on Config Server.

### Dev infrastructure

- `compose.yaml` defines infra split by **profiles** — service `up` is opt-in:
  - `db` → Postgres 18 (host port **5433:5432** — dev machines often have another PG on 5432)
  - `mq` → RabbitMQ 4 management (AMQP **5672**, UI **http://localhost:15672**, `guest/guest`)
  - `cache` → Redis 8 (host port **6380:6379** — dev machines often have another Redis on 6379)
  - `mail` → Mailpit (SMTP **1025**, UI **http://localhost:8025**, no auth)
  - `storage` → MinIO + auto-init (S3 **9000**, console **http://localhost:9001**, `minioadmin/minioadmin`, buckets `pet-photos` / `invoices` / `avatars` pre-created)
  - `all` → every infra service at once
- Spring Boot Docker Compose support auto-detects each container via `org.springframework.boot.service-connection` label (Postgres, RabbitMQ, Redis) and injects connection config — no manual `spring.datasource.url` / `spring.rabbitmq.host`. Mailpit + MinIO have no Boot connection adapter; config defaults live in `application-dev.yml` / per-service yml.
- `lifecycle-management: start-only` — containers persist across app restarts (faster dev loop).
- Per-service `application.yml`: `spring.docker.compose.file: compose.yaml` (relative, resolved from root because run configs set WORKING_DIRECTORY=$PROJECT_DIR$). Service using events/cache/mail/storage adds the relevant profile to `spring.docker.compose.profiles.active` in its own `<service>-dev.yml`.
- Manual stack control: `docker compose --profile all up -d` (everything), `docker compose --profile db --profile mq up -d` (subset).

### Testing strategy

- **Testcontainers, not H2.** H2 in PostgreSQL mode misses Postgres-specific behavior (JSONB, ICU collation, `BIGSERIAL`, advisory locks). Tests use `@Container @ServiceConnection PostgreSQLContainer<>("postgres:18-alpine")` — Spring auto-wires the datasource.
- Test profile keeps Liquibase **enabled** — migration is part of what's being validated.

### Frontend API codegen (orval, contract-driven)

The FE NEVER hand-writes API clients or types. Every BE endpoint becomes a typed function + TanStack Query hook via `orval`. Manual axios calls (`apiRequest({ url: '/v1/auth/login', ... })`) are forbidden after the orval setup landed — they're replaced by `useLogin({ mutation: { onSuccess } })`.

**Pipeline:**

1. **Gateway aggregates OpenAPI** at `/v3/api-docs/{service}` (one entry per downstream). Each gateway route uses `setPath("/v3/api-docs")` to rewrite the request before `lb://{service}`. Configured in `GatewayRoutesConfig` + permitted in `GatewaySecurityConfig`. Swagger UI dropdown at `http://localhost:8180/swagger-ui.html` (config in `config-repo/api-gateway.yml` → `springdoc.swagger-ui.urls`).
2. **`pnpm fetch:openapi`** (script `apps/web/scripts/fetch-openapi.ts`) — fetches 4 specs in parallel from gateway, merges `paths` + `components.schemas` + dedupes `tags` into `apps/web/openapi/petclinic-api.json`. Pageable/PageableObject/SortObject collisions are "last wins" since the shape is identical.
3. **`pnpm generate:api`** — orval reads merged spec + `orval.config.ts` → emits typed functions + `useX` query hooks + `useX` mutation hooks into `apps/web/src/lib/api/generated/` (split by tag). Mutator is `apiMutator` from `lib/api/mutator.ts`, which wraps the project's axios `apiClient` (token interceptor + refresh logic preserved).

**Conventions enforced because of aggregation:**

- **Unique controller method names across services.** Spring uses the Java method name as `operationId` by default. Aggregating multiple services into one spec collides on generic names. Always name methods `listOwners`/`getOwner`/`createOwner` — never bare `list`/`get`/`create`. Orval generates `useListOwners`, `useGetOwner`, etc.
- **Spring `Pageable` becomes a nested object in generated params**: `useSearchVisits({ pageable: { page: 0, size: 50, sort: ['scheduledAt,desc'] } })`, NOT flat `{ page, size, sort }`. `sort` is `string[]`. Surfaces on the FE side — BE controllers stay unchanged.
- **`apiClient.baseURL = ''`** — orval emits full paths (`/api/v1/auth/login`); Vite dev proxy `/api → :8180` resolves them. Prod deploy behind same-origin ingress works identically. `VITE_API_BASE_URL` only override if FE deploys to a different host than the gateway.
- **DON'T edit generated files.** They're regen-overwritten. Helpers that orval can't generate (Vietnamese status labels, color mappings) live next to the feature, vd `features/visits/labels.ts` + `components/VisitStatusBadge.tsx`.

**Workflow when BE API changes:**

```bash
# 1. Restart gateway (if controller paths/operationIds changed)
# 2. Regen:
cd apps/web
pnpm fetch:openapi   # refresh spec from gateway
pnpm generate:api    # regen types + hooks
pnpm typecheck       # TS errors flag broken call sites — fix one by one
```

The `pnpm typecheck` step is the contract enforcement: any place still referencing a removed/renamed endpoint or a changed payload shape errors at build time, not at runtime.

**When orval can't yet generate:**

- Zod forms (validation that can't be inferred from OpenAPI alone) — write in `features/<x>/schemas.ts`. Wire with **TanStack Form** (`@tanstack/react-form`), passing the Zod schema as `validators: { onChange: schema }` (Standard Schema integration — no resolver shim needed). Error rendering goes through `lib/form/FieldError.tsx` which maps `field.state.meta.errors` → `.message` and only shows after `isTouched`. **No `react-hook-form`** in this codebase.
- Cross-cutting state (auth store, query keys for invalidation predicates) — write manually.

## Critical gotchas

**Full details in [`docs/gotchas.md`](docs/gotchas.md)** — read it before touching Boot 4 / Cloud 2025.x version-sensitive code, security, gateway, events, Docker, or Spring AI. The number is a stable ID (look it up in that file):

1. Boot 4 modularization — use `spring-boot-starter-*`; many classes moved packages
2. Postgres 18+ — mount `/var/lib/postgresql` (parent), not `/data`
3. Docker Compose URL override strips `?currentSchema` — use Hibernate `default_schema`
4. Testcontainers 2.x — artifactId `testcontainers-postgresql`, pin version
5. `build-logic/` precompiled plugins show false IDE errors until Gradle sync
6. Service scaffolding order + full phase history (customers → … → genai/RAG)
7. Gateway 5.x property prefix `spring.cloud.gateway.server.webmvc.*`
8. Gateway 5.x — two starters; prefer functional `RouterFunction`
9. `@ConditionalOnClass` on a `@Bean` method is unsafe — put on nested `@Configuration`
10. Spring Security 7 DSL breaking changes + RSA/JWKS JWT pattern
11. Defense-in-depth — gateway AND downstream both validate JWT
12. Gateway WebMVC has no built-in rate limiter — roll your own filter
13. Boot 4 class lookups — verify before importing (several removed/moved)
14. Service-to-service = HTTP Interface + RestClient (NOT Feign)
15. Eureka 2.x — ship BOTH plain `@Primary` + `@LoadBalanced` `RestClient.Builder`
16. `EnumSet` in enum `<clinit>` throws — use `HashSet` + static block
17. JPQL `:param IS NULL OR` fails on Postgres — use Specification
18. Filter-chain security > scattered `@PreAuthorize`
19. Spring AMQP 4.x converter is `JacksonJsonMessageConverter` (no digit)
20. AMQP topology — shared topic exchange + per-consumer DLQ
21. Polyglot: mailer-service is Go, not Spring
22. `ObjectProvider<T>` injection for autoconfig-optional beans
23. Controller method names = orval operationId — must be globally unique
24. Spring `Pageable` → nested `pageable` object in orval params
25. `lib/api/client.ts` baseURL must be `''` after orval setup
26. TanStack Form + Zod — defaultValues must match schema INPUT type
27. SBA auto-discovers Spring (Eureka) services, not polyglot ones
28. Resilience4j `@CircuitBreaker` needs a separate bean (AOP self-invocation)
29. SBA ≥ 4.0.4 required for Boot 4 / Thymeleaf 3.1.5
30. SBA Basic auth + `/instances` CSRF exclusion
31. Per-service Dockerfile in monorepo — 3 traps (`--parents`, CRLF gradlew, healthcheck)
32. Distributed tracing Zipkin — 3 traps (Boot 4 OTLP path, otel image, full URL)
33. Spring AI 2.0.0-M6 — disable model auto-config if service has no LLM
34. Spring AI 2.0.0-M6 — official OpenAI Java SDK; supply both sync + async clients

## MCP and tooling

This project assumes the agent has JetBrains MCP, context7 MCP, and Playwright MCP available. Use them in this priority order:

### 1. JetBrains MCP — primary verification loop (mandatory)

**Why first:** IntelliJ has full project model, Spring Boot YAML schema, Gradle accessor types, Hibernate validators, and live inspection. It catches issues the agent cannot see by reading source alone.

| When | Tool | Why |
|---|---|---|
| After editing any `application.yml` / `application-*.yml` | `mcp__jetbrains__get_file_problems` | YAML typos fail silently at runtime. IntelliJ's Spring Boot inspector flags unknown keys, wrong types, deprecated properties. **Mandatory before bootRun.** |
| After editing `*.gradle.kts`, `libs.versions.toml`, `*.java`, `*.kt` | `mcp__jetbrains__get_file_problems` | Inspection (errors + warnings) before commit. |
| After structural changes (new module, new dep, plugin change, refactor) | `mcp__jetbrains__build_project` | End-to-end compile across all modules. Returns problems with paths + lines. |
| When unsure what user is focused on | `mcp__jetbrains__get_all_open_file_paths`, `get_run_configurations` | See active editor + run configs without asking. |
| To search project semantically | `mcp__jetbrains__search_symbol`, `search_in_files_by_text`, `search_regex` | Faster than Grep when symbols span modules. |

**Rule:** Never report "fix complete" on a service config change without running `get_file_problems` on the modified YAML. YAML errors don't break the build — they break runtime.

### 2. context7 MCP — library docs (mandatory for version-sensitive code)

**Why:** Training data is stale. Spring Boot 4, Spring Cloud 2025.x, springdoc 3.x, Testcontainers 2.x all have breaking changes from the 3.x / 2024.x lines the model was trained on.

```
1. mcp__context7__resolve-library-id   — find /org/project (or /org/project/version)
2. mcp__context7__query-docs           — full question, not single keywords
```

Use for: Spring Boot 4 APIs, Spring Cloud Netflix Eureka, springdoc OpenAPI, Liquibase YAML, Testcontainers, Hibernate 7, Postgres 18 features. **Don't use for** business logic, refactoring, or general Java.

### 3. Playwright MCP — frontend & E2E

Frontend at `apps/web/` (React 19 + Vite + TanStack Router/Query, dev server on `:3333`). Use Playwright for any UI verification:
- `browser_navigate` to a route (vd `http://localhost:3333/admin/visits`)
- `browser_snapshot` to inspect DOM + take screenshot — REQUIRED before reporting UI work done
- `browser_console_messages` to catch runtime errors invisible to `pnpm typecheck`
- `browser_network_requests` to verify orval hooks hit the correct gateway URL with auth header

Never claim "UI works" from typecheck alone — TS doesn't catch missing data, layout breakage, broken auth flow.

### Bash / Gradle CLI fallback

JetBrains MCP doesn't have a "run gradle task" verb (use `mcp__jetbrains__execute_terminal_command` if needed). For curl probes, port kills, and one-shot scripts, plain Bash/PowerShell is fine. Prefer JetBrains build over `./gradlew build` for compile-check (faster — incremental + uses warm daemon).

## Working with this codebase

- When adding a new service, copy `services/customers-service/` and rename. Don't introduce alternative patterns. Update `settings.gradle.kts` `include(":services:<new-name>")` and add an entry to `.run/petclinic-apps.run.xml` (the compound containing all business services).
- Run configs in `.run/` ARE committed. IntelliJ workspace files (`.idea/workspace.xml`, etc.) are NOT. The compound layout has TWO tiers: `🏗️ Petclinic Infra` (config-server + discovery-server — start first) → `🐱 Petclinic Apps` (gateway + auth + customers + vets + visits — start after infra is ready). Postgres must be up via `docker compose --profile db up -d` before infra. All Spring Boot direct-run configs use `SHORTEN_COMMAND_LINE=ARGS_FILE` (Java 9+ `@argfile`) to avoid the Windows command-line length limit.
- When adding a service that makes cross-service calls, add `implementation(project(":shared:common-clients"))` to its `build.gradle.kts`. The autoconfig wires Builder beans + JwtForwardInterceptor; only thing the service writes is the `client/` package (interface + DTO records + `ClientsConfig` `@Bean` factory). See visits-service as the template.
