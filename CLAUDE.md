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

6. **Service ordering when scaffolding new services** — Done so far: `customers-service` (smallest surface: WebMVC + JPA + Liquibase) → `vets-service` (N-N join + Set seed data) → `discovery-server` (Eureka registry, port 8761) → `config-server` (Spring Cloud Config native filesystem, port 8888, reads `config-repo/`). Recommended next: `api-gateway` → `auth-service`. Do NOT start with auth-service — it pulls Security + JPA + JWT + crypto + Mongo all at once, makes debugging miserable.

7. **Boot 4 Spring class lookups** — before importing a Spring class, verify it exists in Boot 4. Examples already encountered as broken:
   - `AutoConfigureDataMongo` — removed
   - `WebExchangeBindException` vs `MethodArgumentNotValidException` — MVC stack uses the latter, WebFlux the former
   - `LiquibaseProperties` — moved to `org.springframework.boot.liquibase.autoconfigure`

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

### 3. Playwright MCP — frontend & E2E (when UI exists)

Not used yet (no frontend module). When `frontend/` is added: `browser_navigate`, `browser_snapshot`, `browser_console_messages` to verify pages render + no console errors after changes. Take screenshots before reporting visual work done.

### Bash / Gradle CLI fallback

JetBrains MCP doesn't have a "run gradle task" verb (use `mcp__jetbrains__execute_terminal_command` if needed). For curl probes, port kills, and one-shot scripts, plain Bash/PowerShell is fine. Prefer JetBrains build over `./gradlew build` for compile-check (faster — incremental + uses warm daemon).

## Working with this codebase

- When adding a new service, copy `services/customers-service/` and rename. Don't introduce alternative patterns. Update `settings.gradle.kts` `include(":services:<new-name>")` and add an entry to `.run/all-services.run.xml`.
- Run configs in `.run/` ARE committed. IntelliJ workspace files (`.idea/workspace.xml`, etc.) are NOT.
