# AGENTS.md

This file is the cross-tool agent guide (Claude Code, Cursor, Aider, Codex CLI, etc.) for working in this repository. Mirrors `CLAUDE.md`.

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
  - `ExceptionTranslator` (`@RestControllerAdvice extends ResponseEntityExceptionHandler`) — RFC 9457 ProblemDetail for everything (domain `ResourceNotFoundException` subclasses, `BadRequestAlertException`, validation errors, all Spring built-ins). Handles base `ResourceNotFoundException` — catches every subclass automatically.
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
- `ExceptionTranslator` is `@RestControllerAdvice extends ResponseEntityExceptionHandler` (extends base class so Spring's built-in exceptions — 404, 405, 415, validation — also return `ProblemDetail` JSON).
- Services only add domain-specific subclasses: `class OwnerNotFoundException extends ResourceNotFoundException { super("Owner", id); }`. The handler in shared catches the base, so subclasses work automatically.
- `BadRequestAlertException` carries `entityName` + `errorKey`. Response includes header `X-PetClinic-Alert` for FE i18n toast without parsing the message string.
- `application.yml`: `spring.mvc.problemdetails.enabled=true` so Spring auto-handles built-in exceptions.

### Configuration files per service

- `application.yml` — **dev defaults**: plain logs with `[traceId,spanId]` correlation pattern, virtual threads, graceful shutdown, springdoc, management on port `90<N>1`
- `application-prod.yml` — production overrides: ECS JSON logs (`logging.structured.format.console=ecs`), `health show-details: never`, tracing sampling 0.1, `spring.docker.compose.enabled=false`
- `src/test/resources/application.yml` — minimal Testcontainers overrides (disable docker-compose support, keep Liquibase enabled)

### Dev infrastructure

- `compose.yaml` defines `postgres` service with label `org.springframework.boot.service-connection: postgres`. Spring Boot Docker Compose support auto-detects, starts container, injects datasource config — no manual `spring.datasource.url`.
- **Host port 5433:5432** (not 5432) because dev machines commonly have another Postgres bound to 5432.
- `lifecycle-management: start-only` — container persists across app restarts (faster dev loop).
- Per-service `application.yml`: `spring.docker.compose.file: compose.yaml` (relative, resolved from root because run configs set WORKING_DIRECTORY=$PROJECT_DIR$).

### Testing strategy

- **Testcontainers, not H2.** H2 in PostgreSQL mode misses Postgres-specific behavior (JSONB, ICU collation, `BIGSERIAL`, advisory locks). Tests use `@Container @ServiceConnection PostgreSQLContainer<>("postgres:18-alpine")` — Spring auto-wires the datasource.
- Test profile keeps Liquibase **enabled** — migration is part of what's being validated.

## Critical gotchas

1. **Spring Boot 4 modularization** — use `spring-boot-starter-*` not raw third-party deps. Boot 4 doesn't auto-configure raw `liquibase-core`, `testcontainers-core`, etc. Many classes moved packages (`LiquibaseProperties`, `AutoConfigureDataMongo` removed entirely). Verify imports against Boot 4 changelog before writing.

2. **Postgres 18+ data directory** — Mount `/var/lib/postgresql` (parent), not `/var/lib/postgresql/data`. Otherwise the container exits with "PostgreSQL data in unused mount/volume" and reports unhealthy.

3. **Spring Boot Docker Compose URL override** — When active, it replaces `spring.datasource.url` based on the `service-connection` label. Query params like `?currentSchema=customers` are stripped. Use Hibernate `default_schema` and keep Liquibase tracking in `public` instead.

4. **Testcontainers 2.x artifactId** (April 2026) — Use `org.testcontainers:testcontainers-postgresql`, NOT `org.testcontainers:postgresql`. Spring Boot BOM does NOT manage Testcontainers 2.x versions, so pin explicitly.

5. **Precompiled script plugins (`build-logic/`)** — IntelliJ inspection often shows ERRORS in `*.gradle.kts` before Gradle sync runs (accessor types not yet generated). Run a Gradle sync — if Gradle build succeeds, the code is correct regardless of IDE squiggles.

6. **Service ordering when scaffolding new services** — customers-service was first (smallest surface: WebMVC + JPA + Liquibase). Recommended next: `discovery-server` → `config-server` → `api-gateway` → `vets-service` → `auth-service`. Do NOT start with auth-service — it pulls Security + JPA + JWT + crypto + Mongo all at once, makes debugging miserable.

7. **Boot 4 Spring class lookups** — before importing a Spring class, verify it exists in Boot 4. Examples already encountered as broken:
   - `AutoConfigureDataMongo` — removed
   - `WebExchangeBindException` vs `MethodArgumentNotValidException` — MVC stack uses the latter, WebFlux the former
   - `LiquibaseProperties` — moved to `org.springframework.boot.liquibase.autoconfigure`

## Working with this codebase

- After editing `*.gradle.kts` / `*.toml` / `pom.xml` / Spring source, use JetBrains MCP `get_file_problems` and `build_project` to verify — IDE inspections often diverge from Gradle compile.
- For library/framework questions (Spring, JPA, Spring Cloud, springdoc, …), use **context7 MCP** with version-pinned IDs like `/spring-projects/spring-boot/v4.0.6`. Do NOT trust Boot 3.x examples found online — verify each symbol.
- When adding a new service, copy `services/customers-service/` and rename. Don't introduce alternative patterns. Update `settings.gradle.kts` `include(":services:<new-name>")` and add an entry to `.run/all-services.run.xml`.
- Run configs in `.run/` ARE committed. IntelliJ workspace files (`.idea/workspace.xml`, etc.) are NOT.
