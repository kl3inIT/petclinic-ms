# petclinic-ms Architecture

This is the source of truth for how the project is currently built. Planned or
aspirational scope belongs in `docs/vision.md` or `docs/roadmap.md`, not here.

## Stack

- Backend: Java 25, Spring Boot 4.1.0, Spring Cloud 2025.1.2 Oakwood, Gradle
  9.5.0 Kotlin DSL, Spring Security 7, Spring Data JPA, Liquibase,
  Resilience4j, Spring Boot Admin 4.1.1, Spring AI 2.0.0, Camunda 8.9.11.
- Frontend: Node >=22, pnpm 11.9.0, Vite 8, React 19.2, TypeScript 5.9,
  TanStack Router/Query/Form/Table, Tailwind 4, shadcn-style components, orval.
- Polyglot services: Go 1.26 for `mailer-service` and `files-service`.
- Data and infra: PostgreSQL/pgvector 18, RabbitMQ 4, Redis 8, MinIO, Mailpit,
  Zipkin OTLP collector, Prometheus, Grafana.
- Build ownership: dependency versions live in `gradle/libs.versions.toml`;
  convention plugins live in `build-logic/`.

## Repository Layout

```text
apps/web/            Vite React frontend
build-logic/         Gradle convention plugins
config-repo/         Spring Cloud Config native repository
docs/                course deliverables plus harness docs
infra/               local observability config
k8s/                 Kubernetes base manifests and infra VM compose files
services/            deployable services
shared/              shared Spring Boot auto-configuration libraries
```

## Deployables

Spring Boot Gradle modules:

| Deployable | Port | Management | Role |
|---|---:|---:|---|
| `config-server` | 8888 | n/a | Spring Cloud Config native filesystem server. |
| `discovery-server` | 8761 | 9761 | Eureka registry. |
| `api-gateway` | 8180 | 9080 | Public gateway, route aggregation, fallback, OpenAPI aggregation. |
| `admin-server` | 8185 | 9185 | Spring Boot Admin dashboard. |
| `auth-service` | 8183 | 9183 | Users, auth, JWT/JWKS, profile links. |
| `customers-service` | 8181 | 9181 | Owners, pets, pet types. |
| `vets-service` | 8182 | 9182 | Vets, specialties, schedules, ratings, badges, media metadata. |
| `visits-service` | 8184 | 9184 | Visits, prescriptions, visit lifecycle, saga initiator. |
| `reviews-service` | 8189 | 9189 | Reviews, moderation, votes, cross-service eligibility checks. |
| `workflow-service` | 8190 | 9190 | Camunda workflow runtime and designer APIs. |
| `billing-service` | 8191 | 9191 | Diseases, invoices, invoice items, checkout. |
| `products-service` | 8192 | 9192 | Products, stock consume/restock. |
| `genai-service` | 8188 | 9188 | Chat, streaming chat, admin LLM configuration. |
| `mcp-server` | 8187 | 9187 | MCP tool server and well-known OAuth metadata. |

Go services:

| Deployable | Port | Role |
|---|---:|---|
| `mailer-service` | 8186 | RabbitMQ consumer, email templates, Redis idempotency, SBA self-registration. |
| `files-service` | 8193 | MinIO/S3 object operations: upload, delete, presign, download, list. |

The current codebase does not have separate `cart-service` or
`inventory-service` modules. Product stock lives in `products-service`; checkout
and payment-facing state lives in `billing-service`.

## Shared Libraries

Shared code lives under `shared/` and is wired through Spring Boot
auto-configuration imports.

- `common-web`: RFC 9457 `ProblemDetail` exception handling, domain base
  exceptions, OpenAPI customizer.
- `common-jpa`: auditing base entity, auditor provider, enum persistence
  helpers, data exception translation.
- `common-security`: JWT resource-server defaults and endpoint security
  customizers.
- `common-clients`: default and load-balanced `RestClient.Builder` beans plus
  JWT forwarding.
- `common-events`: RabbitMQ topic exchange configuration, event publisher,
  queue helper, saga ack/failure envelopes.
- `common-testing`: Testcontainers support and JWT test helpers.

Cross-cutting code belongs here. Domain entities, repositories, and business
services stay in the owning service.

## Runtime Contracts

- Public APIs use `/api/v1/...`.
- Gateway aggregates service OpenAPI docs and the frontend generates clients
  from the merged spec in `apps/web/openapi/petclinic-api.json`.
- Runtime service-to-service calls use `@HttpExchange` interfaces defined in
  the consumer service, not shared DTO packages.
- Async integration uses RabbitMQ topic exchange `petclinic.events` and
  per-consumer queues with DLQs.
- PostgreSQL uses schema-per-service with Liquibase owning schema migration and
  Hibernate `ddl-auto: validate`.
- Spring services use Config Server for env-split config under `config-repo/`.
  `config-server` and `discovery-server` keep self-contained local config.

## Local Infrastructure

`compose.yaml` provides profiles:

- `db`: PostgreSQL/pgvector on host port 5433.
- `mq`: RabbitMQ on 5672 and management UI on 15672.
- `cache`: Redis on host port 6380.
- `mail`: Mailpit SMTP 1025 and UI 8025.
- `storage`: MinIO API 9000, console 9001, bucket initializer.
- `obs`: Zipkin OTLP, Prometheus, Grafana.
- `workflow`: Elasticsearch and Camunda.
- `apps`: service containers.
- `all`: all infrastructure.

## Commands

```bash
./gradlew build
./gradlew :services:customers-service:test
./gradlew :services:vets-service:test
./gradlew :services:visits-service:test

docker compose --profile db up -d
docker compose --profile all up -d

cd services/mailer-service && go test ./...
cd services/files-service && go test ./...

pnpm --filter @petclinic/web dev
pnpm --filter @petclinic/web typecheck
pnpm --filter @petclinic/web fetch:openapi
pnpm --filter @petclinic/web generate:api
pnpm --filter @petclinic/web test:e2e
```

Use terminating tasks for verification. Do not use long-running `bootRun` as a
final verification command.
