# petclinic-ms Vision

`petclinic-ms` is a learning microservices project for MSS301. The goal is to
show a realistic veterinary clinic system using modern Spring Cloud
infrastructure, a broad PetClinic business domain, and current 2026-era tooling.

## Source Composition

The project deliberately combines three sources:

| Source | Used for | Not copied |
|---|---|---|
| Spring official `spring-petclinic-microservices` | Spring Cloud, Eureka, Config Server, Gateway, observability, resilience, Testcontainers, AI reference patterns. | Its small domain surface. |
| Champlain `champlain_petclinic` | Domain breadth: customers, vets, visits, auth, billing, products, mail, files, frontend workflows. | Old Boot 3.1 style, MongoDB-by-default persistence, duplicated service build scripts. |
| This project | Java 25, Spring Boot 4, Gradle conventions, PostgreSQL/Liquibase, RFC 9457 error handling, generated frontend API clients, polyglot services, current deployment assets. | n/a |

Decision rule: Spring official wins for infrastructure, Champlain wins for
domain breadth, and current project conventions win for versions and code style.

## Scope

Current scope is a course-grade but realistic microservices system:

- Clinic administration: owners, pets, pet types, vets, specialties, schedules.
- Visit lifecycle: booking, availability checks, start/complete/cancel,
  prescriptions, workflow integration.
- Auth and security: JWT/JWKS, role-aware frontend routes, downstream resource
  server validation.
- Commerce support: products, stock movements, diseases, invoices, checkout.
- Review and rating workflows.
- AI and MCP integration for assistant-style access.
- Files and mail as small Go services where a JVM service would be too heavy.
- Observability and deployment assets for local compose and Kubernetes.

Out-of-scope unless explicitly added: separate cart and inventory bounded
contexts, production payment provider integration, full production-grade
transactional outbox, and hard multi-tenant isolation.

## Deliverable Shape

- `docs/*.docx` and `docs/diagrams/` are MSS301 deliverables.
- `ARCHITECTURE.md`, `docs/specs/`, `docs/tests/`, and `docs/guidelines/` are
  the repo source of truth for future coding sessions.
- `docs/roadmap.md` tracks progress and future backlog.
