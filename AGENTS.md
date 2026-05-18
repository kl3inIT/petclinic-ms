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
  - Uses `JacksonJsonMessageConverter` (Jackson 3 — Boot 4 default; `Jackson2JsonMessageConverter` is deprecated for removal).
  - **Tolerant Reader on consumer:** consumer redeclares its own DTO record (NOT importing the publisher's event class). Jackson silently ignores fields the consumer doesn't model.
  - **Idempotency:** publisher does NOT guarantee exactly-once. Consumer must dedupe by `eventId` (UUID) — recommend a `processed_events` table with unique constraint, check inside the same `@Transactional` boundary as the side effect.

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

1. **Spring Boot 4 modularization** — use `spring-boot-starter-*` not raw third-party deps. Boot 4 doesn't auto-configure raw `liquibase-core`, `testcontainers-core`, etc. Many classes moved packages (`LiquibaseProperties`, `AutoConfigureDataMongo` removed entirely). Verify imports against Boot 4 changelog before writing.

2. **Postgres 18+ data directory** — Mount `/var/lib/postgresql` (parent), not `/var/lib/postgresql/data`. Otherwise the container exits with "PostgreSQL data in unused mount/volume" and reports unhealthy.

3. **Spring Boot Docker Compose URL override** — When active, it replaces `spring.datasource.url` based on the `service-connection` label. Query params like `?currentSchema=customers` are stripped. Use Hibernate `default_schema` and keep Liquibase tracking in `public` instead.

4. **Testcontainers 2.x artifactId** (April 2026) — Use `org.testcontainers:testcontainers-postgresql`, NOT `org.testcontainers:postgresql`. Spring Boot BOM does NOT manage Testcontainers 2.x versions, so pin explicitly.

5. **Precompiled script plugins (`build-logic/`)** — IntelliJ inspection often shows ERRORS in `*.gradle.kts` before Gradle sync runs (accessor types not yet generated). Run a Gradle sync — if Gradle build succeeds, the code is correct regardless of IDE squiggles.

6. **Service ordering when scaffolding new services** — Done so far: `customers-service` (smallest surface: WebMVC + JPA + Liquibase) → `vets-service` (N-N join + Set seed data) → `discovery-server` (Eureka registry, port 8761) → `config-server` (Spring Cloud Config native filesystem, port 8888, reads `config-repo/`) → `api-gateway` (Spring Cloud Gateway 5.x **WebMVC variant**, port 8180, lb:// routes via Eureka) → `auth-service` Iter 1 (port 8183, register/login/me, HMAC HS256 JWT, Spring Security 7 lambda DSL). Iter 2-4 of security roadmap: defense-in-depth (gateway + downstream validate), RSA + JWKS, service-to-service token forward + rate limit + audit. See `docs/security-flow.html`. Phase 5A added `visits-service` (port 8184, state machine SCHEDULED→IN_PROGRESS→COMPLETED + CANCELLED, cross-service calls to customers/vets via HTTP Interface) — first service to consume `shared/common-clients`. Phase 6A added events infra: `shared/common-events` (RabbitMQ topic exchange + DLX, `EventPublisher`, `EventQueues.consumer()` helper, `JacksonJsonMessageConverter`), `compose.yaml` profiles `mq`/`cache`/`mail`/`storage`/`all`, and **`services/mailer-service/` written in Go 1.26** (NOT Spring — see gotcha #21) as the first polyglot service. Auth-service Iter 5 emits `user.registered` event for mailer to consume. Phase 7A added FE Visits module: gateway OpenAPI aggregation (4 service specs proxied via `/v3/api-docs/{service}` + Swagger UI dropdown), `apps/web/scripts/fetch-openapi.ts` merges into single spec, `pnpm generate:api` produces orval-generated TanStack Query hooks at `apps/web/src/lib/api/generated/`, `apps/web/src/routes/admin.visits.tsx` consumes them with shadcn components. Phase 7B added Owners CRUD (list+create+delete+detail-with-pets) and Pets read-only table, plus a codebase-wide migration from `react-hook-form` to `@tanstack/react-form` (5 dialogs/routes), with `lib/form/FieldError.tsx` standardizing error display. Phase 8A added `services/admin-server/` (Spring Boot Admin 4.0.0, port 8185/9185) — UI dashboard discovers 5 Spring services via Eureka; mailer (Go) self-registers via HTTP POST `/instances` and exposes fake `/actuator/health` + `/actuator/info` for green-dot visibility. Shared `application.yml` exposure widened to include `loggers, env, mappings, threaddump, heapdump, configprops, beans, scheduledtasks`. Phase 8B added Resilience4j `@CircuitBreaker` on `VisitServiceImpl` cross-service calls (extracted to `client/RemoteClientsFacade` to avoid Spring AOP self-invocation), `ExternalServiceUnavailableException` → HTTP 503 in `common-web/ExceptionTranslator`, plus Basic auth + form-login on admin-server (`SecurityConfig`); mailer Go self-register sends Basic auth header (`ADMIN_USER`/`ADMIN_PASSWORD` env). SBA 4.0.0 → 4.0.4 (codecentric#5251) for Thymeleaf 3.1.5 compatibility. Phase 9 added containerization: root `Dockerfile` parameterized via `ARG SERVICE` (single template for 8 Spring services — config/discovery/gateway/auth/customers/vets/visits/admin), jlink custom JRE from `jdeps` analysis (~80MB runtime image), Spring Boot layered JAR for cache-efficient layers, non-root user (uid 1654), tini PID 1, container-aware JVM flags (`UseContainerSupport`, `MaxRAMPercentage=75`). `.dockerignore` excludes build outputs/IDE/secrets. `compose.yaml` profile "apps" runs full Spring stack with healthcheck-based `depends_on` ordering (config→discovery→business→gateway). CI workflow extends to 5 jobs: gradle build+test, FE pnpm typecheck/lint/build, Go vet/build/test, Docker buildx matrix (8 Spring + 1 Go) with ghcr.io push on tag. Phase 10a added distributed tracing: `io.opentelemetry:opentelemetry-exporter-otlp` runtime dep on 8 Spring services, `ghcr.io/openzipkin-contrib/zipkin-otel:latest` container as profile `obs`, `management.opentelemetry.tracing.export.otlp.endpoint` (Boot 4 path) shipping spans to `http://zipkin:9411/v1/traces`. Full stack demo: `docker compose --profile all --profile apps --profile obs up -d --build` → book a visit → Zipkin UI at http://localhost:9411 shows waterfall across api-gateway → visits-service → customers-service + vets-service. Mailer (Go) not instrumented yet — span lineage stops at the RabbitMQ publish. Phase 12a added `services/mcp-server/` (port 8187, MCP server via `spring-ai-starter-mcp-server-webmvc` 2.0.0-M6, 8 read-only tools across Customers/Vets/Visits domains). 9 Spring services now in CI Docker matrix. Default SSE transport: GET `/sse` → opens stream, server responds with `event:endpoint data:/mcp/message?sessionId=...`; subsequent POST to that URL ships JSON-RPC. STREAMABLE protocol (modern, stateless HTTP) is the 2.0 direction but webmvc starter still defaults to SSE for backward compat. Phase 12b added `services/genai-service/` (port 8188): chatbot endpoint `POST /api/v1/ai/chat` (JWT-protected), consumes `mcp-server` tools via `spring-ai-starter-mcp-client` (SyncMcpToolCallbackProvider auto-discovers from `spring.ai.mcp.client.sse.connections.*` config), Postgres-backed memory (`JdbcChatMemoryRepository` + schema `genai.spring_ai_chat_memory`). LLM via OpenRouter (OpenAI-compatible at `https://openrouter.ai/api/v1`) — same SDK code works for OpenAI/Anthropic/Llama/DeepSeek/Gemini just by changing the `petclinic.ai.llm.chat-model` string. Reference pattern from zero-mail's `backend/core/llm/gateway/springai/` (BYOK + OpenAI adapter), but no code ported. 10 Spring services now in CI Docker matrix. Phase 12c added admin BYOK endpoints under `/api/v1/admin/llm/**` (ROLE_ADMIN): GET `/current` (apiKey masked), POST `/config` (save + auto-rebuild ChatClient), POST `/validate` (ping LLM với config tùy ý, không save), POST `/test` (ping config đang active). DB row `genai.ai_llm_config` (singleton id=1) stores AES-GCM encrypted apiKey; cipher = `AesGcmEncryptor` (32-byte key qua `PETCLINIC_CRYPTO_KEY` env, base64). `LlmClientHolder` cầm volatile ChatClient + rebuild() atomic swap khi admin save; `LlmConfigService` @PostConstruct override env bootstrap nếu DB có row. ChatController gọi `holder.chatClient()` mỗi request (snapshot read).

7. **Spring Cloud Gateway 5.x property prefix** — Cloud 5.0+ (Boot 4 / Cloud 2025.x) renamed property prefix from `spring.cloud.gateway.mvc.*` (older docs / Cloud 4.x) to **`spring.cloud.gateway.server.webmvc.*`**. Cross-check via `/actuator/configprops` — bean `gatewayMvcProperties` shows the true prefix. Many web examples and even some context7 doc excerpts still use the old prefix; ignore them.

8. **Spring Cloud Gateway 5.x — TWO starters** — replaces the old single `spring-cloud-starter-gateway`. Choose ONE:
   - `spring-cloud-starter-gateway-server-webmvc` ← what this project uses (consistent with MVC stack + virtual threads)
   - `spring-cloud-starter-gateway-server-webflux` ← reactive variant, kept in `libs.versions.toml` as alternative

   **Routes definition: prefer functional `@Bean RouterFunction<ServerResponse>`** (canonical for WebMVC variant). YAML `spring.cloud.gateway.server.webmvc.routes` supports predicates + uri OK, but filter shortcuts like `CircuitBreaker=...` / `Retry=...` don't wire through the HandlerFilterFunction chain in 5.0.x. Functional API wraps filters correctly — see `services/api-gateway/.../GatewayRoutesConfig.java`. Static imports: `GatewayRouterFunctions.route`, `HandlerFunctions.http`, `GatewayRequestPredicates.path`, `LoadBalancerFilterFunctions.lb`, `CircuitBreakerFilterFunctions.circuitBreaker`, `RetryFilterFunctions.retry`.

9. **Shared module `@ConditionalOnClass` on a `@Bean` method is unsafe** — Spring still introspects the method signature (return type, parameter types). If the conditional class is missing on classpath (vd: api-gateway doesn't have springdoc), `NoClassDefFoundError` at autoconfig load. **Fix**: put `@ConditionalOnClass` on a nested `@Configuration` static class (Spring skips the entire class before introspection). Already applied in `PetClinicWebAutoConfiguration.OpenApiConfig`. Same reason `DataExceptionTranslator` (uses `ConcurrencyFailureException` from spring-tx) lives in `shared/common-jpa` not `shared/common-web` — gateway has no JPA = no spring-tx.

10. **Spring Security 7 (Boot 4) DSL** — heavy breaking changes from Security 6.x. All removed in 7:
    - `and()` → use lambda style exclusively (`.csrf(c -> ...).sessionManagement(s -> ...)`)
    - `authorizeRequests()` → `authorizeHttpRequests()`
    - `MvcRequestMatcher` / `AntPathRequestMatcher` → just pass String pattern (uses `PathPatternRequestMatcher` under the hood)
    - OAuth2 password grant removed
    - `AuthorizationManager#check` → `AuthorizationManager#authorize`

    JWT pattern (production-grade, what auth-service does):
    - Auth-service generates RSA-2048 keypair at startup (`KeyPairGenerator`), wraps as Nimbus `RSAKey` with random `kid`
    - `JwtEncoder` = `NimbusJwtEncoder(new ImmutableJWKSet<>(jwkSet))` signs RS256
    - Public keys exposed via `/.well-known/jwks.json` (use `jwkSet.toJSONObject(true)` to strip private params)
    - Other services (customers/vets/gateway) validate via shared `common-security` autoconfig:
      `NimbusJwtDecoder.withJwkSetUri(uri).build()` + token validators for `iss`+`aud`+`exp`
    - Map JWT `roles` claim → `ROLE_*` authorities via `JwtGrantedAuthoritiesConverter.setAuthoritiesClaimName("roles")` + `setAuthorityPrefix("ROLE_")`
    - Refresh tokens stored in DB as SHA-256 hash (not raw), rotated single-use, detect-reuse revokes all user tokens

11. **Defense-in-depth across the cluster** — gateway validates JWT and downstream services validate AGAIN (zero-trust). Both consume the same `shared/common-security` autoconfig — same JWKS URI, same decoder, same converter. Never trust gateway-forwarded headers (`X-User-Id`) blindly — always re-verify the bearer token.

12. **Spring Cloud Gateway WebMVC 5.0.x has NO built-in rate limiter** (Reactive variant has `RequestRateLimiter` filter w/ Redis; WebMVC variant doesn't). Roll your own as `HandlerFilterFunction<ServerResponse, ServerResponse>` using `ConcurrentHashMap<String, Bucket>` keyed by `request.servletRequest().getRemoteAddr()`. See `api-gateway/.../PerIpRateLimit.java`. Multi-instance gateway → swap in Redis-backed store.

13. **Boot 4 Spring class lookups** — before importing a Spring class, verify it exists in Boot 4. Examples already encountered as broken:
   - `AutoConfigureDataMongo` — removed
   - `WebExchangeBindException` vs `MethodArgumentNotValidException` — MVC stack uses the latter, WebFlux the former
   - `LiquibaseProperties` — moved to `org.springframework.boot.liquibase.autoconfigure`

14. **Service-to-service HTTP client = HTTP Interface + RestClient (NOT Feign)** — Spring Framework 6+ `@HttpExchange` interface is the canonical replacement for Feign on new projects. Spring Cloud OpenFeign still works but is no longer the recommended path for Spring Boot 4 / Cloud 2025.x. Pattern: declare interface in CONSUMER service (not shared), local `<Entity>Summary` records (Tolerant Reader — only fields the consumer reads), `@Bean` factory builds proxy via `HttpServiceProxyFactory.builderFor(RestClientAdapter.create(restClient)).build().createClient(Iface.class)`. See visits-service `client/CustomersClient.java`. **Resilience4j** wrap (timeout / retry / circuit breaker) via `@CircuitBreaker` / `@TimeLimiter` / `@Retry` annotations on the service method, NOT on the client interface itself (annotations don't propagate through Spring proxies the same way).

15. **Eureka 2.x + RestClient transport — ALWAYS ship BOTH a plain `@Primary` and a `@LoadBalanced` `RestClient.Builder`** — `DiscoveryClientOptionalArgsConfiguration.restClientDiscoveryClientOptionalArgs` injects `ObjectProvider<RestClient.Builder>` (no qualifier) and uses `getIfAvailable(RestClient::builder)` to call `http://<eureka-host>:8761/eureka/`. Boot's `RestClientAutoConfiguration.restClientBuilder` is `@ConditionalOnMissingBean` — once ANY `RestClient.Builder` bean exists (including a `@LoadBalanced` one), Boot skips its default. If only the LB builder exists, Eureka picks it → LoadBalancer treats hostname "localhost" as a service ID → `No instances available for localhost` heartbeat spam. `shared/common-clients` provides both, named `defaultRestClientBuilder` (`@Primary`) + `loadBalancedRestClientBuilder` (`@LoadBalanced`), both `@ConditionalOnMissingBean(name=...)` so services can override either.

16. **EnumSet inside enum constructor throws `ClassCastException: not an enum`** — `EnumSet.noneOf(MyEnum.class)` called from MyEnum's `<clinit>` (constructor or initializer) fails because the class is still mid-load — JVM hasn't marked it as an enum yet. Pattern: use `private final Set<MyEnum> allowed = new HashSet<>()` and populate via static block AFTER all constants are declared. See `visits-service/.../VisitStatus.java`. State-machine enums also implement `OrderedEnum` from `common-jpa` for stable `id()` + `weight()` (see gotcha around shared enums).

17. **Postgres + JPQL `(:param IS NULL OR field = :param)` filter pattern fails with "could not determine data type of parameter $N"** — Postgres can't infer NULL parameter type when the same param is bound twice in `IS NULL OR =` shape. Use Spring Data **Specification** (`JpaSpecificationExecutor<T>`) for dynamic filters: add predicate to the criteria query only when the param is non-null. See `visits-service/.../VisitSpecifications.java` + `VisitRepository extends JpaRepository<Visit, Long>, JpaSpecificationExecutor<Visit>`. Cleaner than COALESCE workarounds and avoids the bug entirely.

18. **Filter-chain security > scattered `@PreAuthorize`** — declare role + URL rules in a single `<Service>SecurityConfig` overriding `common-security`'s default `SecurityFilterChain`. Controller stays free of annotations. Resource-level checks (e.g., "USER can only cancel own visit") live in the SERVICE layer after the entity is loaded — throw `AccessDeniedException` from `org.springframework.security.access`. Avoids: (a) double DB hit when `@PreAuthorize` triggers entity load via `@securityHelper.isOwner(#id)`, (b) rules scattered between filter chain + `@PreAuthorize`, (c) testing controllers with full Spring Security context. See `visits-service/.../config/VisitsSecurityConfig.java`.

19. **Spring AMQP 4.x renamed the Jackson 3 converter to `JacksonJsonMessageConverter` (no version digit)** — Boot 4 / Spring AMQP 4 ship Jackson 3 as default. The class is **`org.springframework.amqp.support.converter.JacksonJsonMessageConverter`** (NOT `Jackson3JsonMessageConverter` — that name doesn't exist). The Jackson 2 variant retains its number: `Jackson2JsonMessageConverter` (kept but deprecated for removal). When Boot AMQP autoconfig sees a `MessageConverter` bean it wires it onto `RabbitTemplate` automatically — `common-events` declares `JacksonJsonMessageConverter` as `@ConditionalOnMissingBean(MessageConverter.class)` so services can override.

20. **AMQP event topology — fanout via topic exchange, per-consumer DLQ** — `common-events` declares ONE shared topic exchange (`petclinic.events`) + ONE shared DLX (`petclinic.events.dlx`). Consumers declare their own queue per event type using `EventQueues.consumer("<service>.<routingKey>", routingKey, props)` which sets `x-dead-letter-exchange` + `x-dead-letter-routing-key` on the main queue, creates a parallel `.dlq` queue, and binds both to the right exchange. **Per-service per-event-type** queues (not shared) → independent retry, independent failure isolation, easy to inspect a single subscriber's stuck messages.

21. **Polyglot service: mailer-service is Go, not Spring** — `services/mailer-service/` is a Go 1.26 module (NOT in Gradle multi-module, NOT registered with Eureka). It consumes `petclinic.events` exchange and sends SMTP via Mailpit. Rationale: ~25 MB RAM idle / ~50ms startup vs ~300 MB / ~10s for Spring — and the workload (RMQ consumer + SMTP sender + idempotency) has no JPA, no transactions, no OAuth. Tolerant Reader applied at language boundary: Go side redefines event payload structs with JSON tags, only fields it actually reads — Jackson serializes full record on publisher side, encoding/json ignores extras on consumer side. AMQP topology declared manually in `internal/consumer/consumer.go` to mirror what the Java `EventQueues.consumer()` helper produces (same exchange names, same queue naming convention `<service>.<routingKey>`, same DLQ pattern with `x-dead-letter-exchange` arg). Auth-service injects `ObjectProvider<EventPublisher>` and try/catches broker errors so register() succeeds even when RabbitMQ is down — outbox pattern deferred until first event that touches money (invoices/payments).

22. **Spring Boot `ObjectProvider<T>` injection for autoconfig-optional beans** — when a bean comes from an autoconfig that may be disabled (vd `petclinic.events.enabled=false` in test profile turns off `EventPublisher`), inject `ObjectProvider<EventPublisher>` instead of `EventPublisher` directly. Then `provider.getIfAvailable()` returns `null` when bean missing without breaking the constructor. Avoids splitting `@ConditionalOn*` between the publisher autoconfig and every consumer service. Same pattern Eureka uses for `RestClient.Builder` (gotcha #15).

23. **Controller method names ARE the orval operationId — must be unique across services** — Spring uses the Java method name as the OpenAPI `operationId` unless `@Operation(operationId = "...")` overrides. After gateway OpenAPI aggregation merges 4 service specs into one, generic names like `list`, `get`, `create` collide → orval errors out (`Duplicate schema names detected: 2x ListParams` etc.). **Rule**: name controller methods after the resource — `listOwners` / `getOwner` / `createOwner` / `deleteOwner`, `searchVisits` / `bookVisit` / `completeVisit`, `getUser`. Bonus: code reads more naturally even within a single controller. Fix at source, NOT at the fetch-openapi merge script (prefixing operationIds in post-process works but couples the gen pipeline to BE generic-name leakage).

24. **Spring `Pageable` becomes a nested `pageable` object in orval-generated params** — `springdoc-openapi` emits a Spring `Pageable` controller arg as a single nested OpenAPI parameter (not flattened to `page`/`size`/`sort`). Orval generates `SearchVisitsParams { pageable: Pageable; ... }` where `Pageable = { page?: number; size?: number; sort?: string[] }`. Call site is `useSearchVisits({ pageable: { page: 0, size: 50, sort: ['scheduledAt,desc'] } })`, NOT `useSearchVisits({ page: 0, size: 50, sort: 'scheduledAt,desc' })`. Note `sort` is `string[]`, not a single string. Visible only on FE — BE controllers stay clean.

25. **`apps/web/src/lib/api/client.ts` baseURL must be empty string after orval setup** — orval-generated functions emit full paths (`/api/v1/auth/login`). If axios baseURL is also `/api`, requests get duplicated to `/api/api/v1/auth/login` → 404. Set `baseURL = ''` so orval URLs resolve as-is; Vite dev proxy `/api → :8180` (in `vite.config.ts`) forwards them. The previous baseURL `/api` was for the old manual `apiRequest({ url: '/v1/auth/login' })` pattern which is now deleted. Refresh-token call inside the interceptor must use full path too (`/api/v1/auth/refresh`).

26. **TanStack Form + Zod: defaultValues must match the Zod schema's INPUT type exactly** — TanStack Form's Standard Schema integration types `validators.onChange: ZodSchema` strictly. If schema has `reason: z.string().optional()` but `defaultValues = { reason: '' }`, TS errors with "Type 'string | undefined' is not assignable to 'string'" because the schema's input type is `{ reason?: string | undefined }` while the form state is `{ reason: string }`. **Fix at the schema**: drop `.optional()` for fields that always have a default empty string, and strip empty values to `undefined` at the `onSubmit` boundary (`value.reason || undefined`). Don't `as Type` cast the defaultValues — that hides the mismatch and breaks form inference downstream. Also: don't use `react-hook-form` here. The codebase standardized on `@tanstack/react-form` for stack consistency with `@tanstack/react-router` + `@tanstack/react-query`. Error rendering goes through `lib/form/FieldError.tsx` (maps `meta.errors` → `.message`, gated by `isTouched`).

28. **Resilience4j `@CircuitBreaker` must live in a SEPARATE bean from the caller (self-invocation bypasses Spring AOP)** — Spring AOP proxies wrap the bean from the outside; calling `this.fetchPet(...)` from another method in the SAME class goes through the raw object, NOT the proxy → the `@CircuitBreaker` advice never runs and the CB stays CLOSED forever (visible symptom: `bufferedCalls > 0` but `failedCalls = 0` in `/actuator/circuitbreakers`, all calls hit network, no fallback). **Fix**: extract CB methods into a `@Component` like `RemoteClientsFacade` and inject it into the caller. Each call now crosses a bean boundary and the proxy intercepts. Public visibility on the CB method alone is NOT sufficient — the boundary matters, not the modifier. Fallback signature: `(originalArgs..., Throwable)` returning the same type. Config caveats: use ONLY `ignore-exceptions` (whitelist) — don't use `record-exceptions` because Eureka LB short-circuits with `IllegalStateException("No instances available for X")` which won't match a hand-written whitelist of `IOException`/`ResourceAccessException`/etc. Ignore-list keeps 4xx (404, 400, 401, 403) from counting as health failures.

29. **Use SBA ≥ 4.0.4 with Spring Boot 4 / Thymeleaf 3.1.5** — Thymeleaf 3.1.4+ enforces a "restricted" SpEL evaluation context on CSS templates, forbidding `T(...)`, `new`, and `@bean` method invocations. SBA 4.0.0's `variables.css` (theme injection) still uses those → runtime error `Instantiation of new objects and access to static classes or parameters is forbidden in this context`. **Fix: upgrade SBA to 4.0.4** (codecentric/spring-boot-admin#5251 — "expose colors configured in settings directly rather than calling a method"). Don't downgrade Thymeleaf — Boot 4 BOM pins 3.1.5 for security reasons and the right answer is to upgrade SBA.

31. **Per-service Dockerfile in monorepo: 3 gotchas** — (a) **`settings.gradle.kts` requires ALL module dirs to exist** even when building 1 service. `include(":services:auth-service")` fails with "project directory does not exist" if `services/auth-service/` not in build context. Fix: copy ALL module `build.gradle.kts` via `COPY --parents shared/*/build.gradle.kts services/*/build.gradle.kts ./` (Dockerfile syntax `1.7-labs` needed for `--parents`). Build files are tiny + don't invalidate cache on source change. Source copies stay per-service. (b) **`gradlew` on Windows checkout has CRLF line endings** → in Linux container `#!/bin/sh\r` interpreted as non-existent → `./gradlew: not found`. Two-layer fix: `.gitattributes` enforces `gradlew text eol=lf` at checkout; Dockerfile defensive `sed -i 's/\r$//' gradlew && chmod +x gradlew` for repos already checked out wrong. (c) **HEALTHCHECK lives in compose.yaml, not Dockerfile** — each service has different management port (9181/9182/...). Inside container, `SPRING_DOCKER_COMPOSE_ENABLED=false` else Spring Boot tries to spawn nested compose. Image stack: `eclipse-temurin:25-jdk-alpine` (builder) → `alpine:3.21` (runtime, with jlink-built custom JRE COPY'd from builder) + tini + non-root 1654 + Spring Boot layered JAR. Builder MUST match runtime libc family — `jdk-alpine` (musl) → `alpine` works; `jdk-noble` (glibc) → `alpine` FAILS with "java: No such file or directory" because the binary can't dynamic-link. Image sizes: 179-292 MB (config/discovery smallest, visits largest due to Resilience4j + common-events + common-clients deps). `jdeps --print-module-deps` on the fat JAR computes exact module set; add back `java.management.rmi`, `jdk.management.agent`, `jdk.naming.dns`, `java.compiler`, `java.scripting` because Spring Actuator + Eureka + Spring AOT runtime use reflection that `jdeps` static analysis can't see.

30. **Spring Boot Admin Basic auth + `/instances` CSRF exclusion** — when adding `spring-boot-starter-security` to admin-server, you MUST permit-all + skip CSRF for `/instances`, `/instances/*`, `/actuator/**` (and `/assets/**`, `/login`, `/variables.css` for the UI). SBA clients (and polyglot self-registers like the Go mailer) POST to `/instances` without a session cookie → CSRF would block them. The Spring SBA-client autoconfig sets Basic auth header automatically; polyglot clients must `req.SetBasicAuth(user, pwd)` themselves. Endpoint scrape uses separate creds via `spring.boot.admin.instance-auth.default-user-name/password` if downstream actuator is locked down.

27. **Spring Boot Admin auto-discovers Spring services via Eureka, NOT polyglot ones** — `admin-server` (port 8185) reads the Eureka registry and scrapes `/actuator/{health,info,metrics,...}` on each instance. Pre-req for a service to show up: (a) it must register to Eureka and (b) its actuator endpoints must be reachable. The Go `mailer-service` does NOT register to Eureka (no Java/Spring) — instead it (1) exposes fake `/actuator/health` + `/actuator/info` JSON in `cmd/mailer/main.go` (Spring-shape `{"status":"UP"}`), and (2) self-registers via background goroutine `internal/sba/register.go` that POSTs `{name, healthUrl, managementUrl, serviceUrl}` to SBA `/instances` every 30s. SBA shows a green dot, but tabs like Metrics/Loggers/Threads are empty for mailer (no real Actuator endpoints to scrape). Don't try to fully simulate Actuator from Go — wasted effort; for real polyglot observability use Prometheus + Grafana with `prometheus/client_golang`. `ADMIN_SERVER_URL=""` disables the self-register loop.

34. **Spring AI 2.0.0-M6 → official OpenAI Java SDK (breaking change vs 1.x)** — 2.0 KHÔNG còn `OpenAiApi.builder()` tự viết. `OpenAiChatModel.Builder` giờ nhận `com.openai.client.OpenAIClient` (sync) và `com.openai.client.OpenAIClientAsync` (async) từ official `com.openai:openai-java` SDK (transitively kéo qua spring-ai-openai 2.0.0-M6). Pattern: `OpenAIOkHttpClient.builder().baseUrl(...).apiKey(...).build()`. **Trap**: nếu chỉ cung cấp sync client `.openAiClient(...)`, Spring AI vẫn tự tạo async client trong constructor → fallback đọc `OPENAI_API_KEY` env → throw `IllegalStateException: At least one credential source must be specified` khi env thiếu. **Fix**: cung cấp CẢ 2 bean (`OpenAIClient` + `OpenAIClientAsync`) qua `.openAiClient(...)` + `.openAiClientAsync(...)`. Xem `genai-service/.../ChatClientConfig.java`. ChatMemory 2.0 cũng có breaking: `MessageChatMemoryAdvisor.Builder.conversationId(...)` đã REMOVE; set conversationId per-call qua `.advisors(a -> a.param(ChatMemory.CONVERSATION_ID, id))`. JdbcChatMemoryRepository default table = `spring_ai_chat_memory` (4 columns: conversation_id VARCHAR(36), content TEXT, type VARCHAR(10) CHECK USER|ASSISTANT|SYSTEM|TOOL, "timestamp" TIMESTAMP); mở rộng conversation_id lên VARCHAR(128) nếu key pattern dài hơn UUID (vd `u:<uuid>:t:<thread>`). Artifact rename: `spring-ai-model-chat-memory-*` → `spring-ai-model-chat-memory-repository-*` + package thêm `.repository.` segment. **OpenRouter routing**: dùng `spring-ai-starter-model-openai` với `baseUrl=https://openrouter.ai/api/v1`. 1 SDK đa-provider — model name là `provider/model` (vd `anthropic/claude-3.5-haiku`, `openai/gpt-4o-mini`, `google/gemini-2.5-flash`). Pattern này từ zero-mail (EXE202).

33. **Spring AI 2.0.0-M6 — TẮT model auto-config nếu service không chạy LLM** — `spring-ai-starter-mcp-server-webmvc` kéo theo `spring-ai-openai` transitively. `spring-ai-openai` starter eagerly creates `OpenAiChatModel` + `OpenAiEmbeddingModel` + `OpenAiAudioSpeechModel` + `OpenAiImageModel` + `OpenAiModerationModel` ở boot — TẤT CẢ require `spring.ai.openai.api-key` non-empty. Service như `mcp-server` (chỉ expose tools, không gọi LLM) sẽ boot-fail với `IllegalArgumentException: OpenAI API key must be set`. **Fix**: set `spring.ai.model.{chat,embedding,embedding.text,embedding.multimodal,image,audio.speech,audio.transcription,moderation}=none` trong config (xem `config-repo/mcp-server.yml`). Pattern này thấy từ zero-mail's `application.yml` — họ làm cùng vì BYOK provider-specific tránh shared starter beans. Spring AI BOM import: chỉ scope ở module-level `dependencyManagement.imports.mavenBom("org.springframework.ai:spring-ai-bom:${libs.versions.springAi.get()}")` thay vì convention plugin — giảm blast radius khi M6 → GA breaking change. `@Tool` annotation từ `org.springframework.ai.tool.annotation.Tool`; register bằng `@Bean ToolCallbackProvider` qua `MethodToolCallbackProvider.builder().toolObjects(...)`; starter auto-pickup ToolCallbackProvider beans → expose qua MCP transport. Default transport: SSE (GET `/sse` → session-bound `/mcp/message?sessionId=...`). STREAMABLE protocol exists nhưng webmvc starter chưa default sang, sẽ chuyển trong GA.

32. **Distributed tracing with Zipkin — 3 traps** — Phase 10a adds OTLP/HTTP shipping to Zipkin. (a) **Spring Boot 4 renamed the OTLP property path**: Boot 3 used `management.otlp.tracing.endpoint`; Boot 4 moved it to `management.opentelemetry.tracing.export.otlp.endpoint`. Boot 3 docs/blog posts copy-pasted into Boot 4 → silently no export (property bound to nothing, exporter never starts). Verify via `/actuator/configprops` → bean `opentelemetryTracingProperties`. (b) **`openzipkin/zipkin:3` image does NOT include the OTLP HTTP collector**. The OTLP module lives in repo `openzipkin-contrib/zipkin-otel` and is distributed only via image `ghcr.io/openzipkin-contrib/zipkin-otel:latest`. Symptom: POST to `:9411/v1/traces` returns `HTTP 404 Armeria/1.38.0` on the base image. Switch to the otel-bundle image. (c) **Spring's OTLP endpoint property takes the FULL URL including the signal path** (`http://zipkin:9411/v1/traces`), unlike the bare OTel SDK env `OTEL_EXPORTER_OTLP_ENDPOINT=http://zipkin:9411` which auto-appends `/v1/traces`. Mixing the two conventions sends spans to `:9411/v1/traces/v1/traces`. The OTLP receiver accepts protobuf (`Content-Type: application/x-protobuf`) by default — JSON OTLP works on some implementations but not all; Spring's exporter uses protobuf so this is moot in practice. Sampling: `management.tracing.sampling.probability=1.0` for dev (sample everything), `0.1` for prod (10%, save storage). The dep set is `micrometer-tracing-bridge-otel` (Observation API → OTel) + `runtimeOnly io.opentelemetry:opentelemetry-exporter-otlp` (HTTP shipper) — both versions managed by Spring Boot 4 BOM, never pin manually.

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
