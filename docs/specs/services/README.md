# Service Specs

This catalog records current service ownership. Add or split per-service files
when a service is next changed.

| Service | Current ownership |
|---|---|
| `config-server` | Native filesystem Spring Cloud Config server for `config-repo/`. |
| `discovery-server` | Eureka registry. |
| `api-gateway` | Public gateway, fallback route, OpenAPI aggregation, route-level security/rate-limiting. |
| `admin-server` | Spring Boot Admin dashboard. |
| `auth-service` | Registration, login, refresh/logout, current user, admin users, customer/vet links, JWKS, and a dev customer account linked to owner seed #1. |
| `customers-service` | Owners, pets, pet types, owner/pet events, and Files service media-reference validation. |
| [`vets-service`](vets.md) | Vets, specialties, work schedules, one-time customer ratings, badges, vet media metadata, and Files service media-reference validation. |
| `visits-service` | Visit booking/search/lifecycle, prescriptions, PDF generation, workflow callbacks, notification/billing sagas. Completion events always reach the billing saga; remote customer/pet/vet enrichment is best-effort so shared-token workflow callbacks can fall back to visit snapshots. |
| `reviews-service` | Review creation/listing, moderation, votes, purchase/visit eligibility checks. |
| `workflow-service` | Camunda workflows, process definitions, instances, user tasks, designer support. |
| `billing-service` | Diseases, invoices, invoice items, checkout, prescription/visit billing consumers. |
| `products-service` | Product catalog, stock consume/restock. |
| `genai-service` | Chat, streaming chat, LLM config encryption/validation/test. |
| `mcp-server` | MCP tool exposure and well-known OAuth protected-resource metadata. |
| `mailer-service` | Email event consumer, template renderer, Redis idempotency, SBA registration. |
| `files-service` | MinIO object operations for binary files. |

Known absent bounded contexts: no separate `cart-service` and no separate
`inventory-service` currently exist in code.
