# petclinic-ms Roadmap

Status reflects the repository state inspected on 2026-07-09. It is a progress
tracker, not the architecture source of truth.

## Current Progress

| Area | Status | Evidence |
|---|---|---|
| Course documents | Done, pending final human review | `docs/SDD_PCMS_v1.0.docx`, `docs/MSS301-SRS.docx`, `docs/SRS_PCMS_v1.0.docx`, generated diagrams under `docs/diagrams/`. |
| Documentation harness | In progress | Thin root maps plus source-of-truth Markdown docs added. |
| Spring Cloud foundation | Implemented | Config Server, Eureka, Gateway, Admin Server, shared config repo, compose, k8s base manifests. |
| Shared libraries | Implemented | `common-web`, `common-jpa`, `common-security`, `common-clients`, `common-events`, `common-testing`. |
| Core domain services | Implemented in code | Auth, customers, vets, visits, reviews, billing, products. |
| AI/workflow/MCP | Implemented in code | `genai-service`, `workflow-service`, `mcp-server`, Camunda/BPMN frontend. |
| Polyglot support | Implemented in code | Go `mailer-service` and Go `files-service`. |
| Frontend | Substantial implementation | Admin, customer, vet, store, workflow, AI, generated API client, TanStack forms/routes/query. |
| Deployment assets | Implemented but needs deployment validation | Compose profiles and Kubernetes base manifests exist. |
| Automated tests | Partial | Unit/integration tests exist across services; Playwright smoke exists. Full end-to-end stack coverage is not complete. |

## Coding Progress Summary

Implemented service directories:

- Spring Boot: `config-server`, `discovery-server`, `api-gateway`,
  `admin-server`, `auth-service`, `customers-service`, `vets-service`,
  `visits-service`, `reviews-service`, `billing-service`, `products-service`,
  `workflow-service`, `genai-service`, `mcp-server`.
- Go: `mailer-service`, `files-service`.

Known gaps from current repo shape:

- No separate `cart-service` module.
- No separate `inventory-service` module.
- End-to-end browser tests are still smoke-level compared with the breadth of
  frontend routes.
- Some generated/new course diagram assets are untracked in the working tree.

## Backlog

- Decide whether cart and inventory stay folded into products/billing or become
  separate bounded contexts.
- Add per-service spec files when a service changes next, starting with visits,
  billing, products, reviews, files, and workflow.
- Expand Playwright coverage for login, admin products, visits, checkout, and
  customer booking flows.
- Add deployment validation notes after the compose/k8s stack is exercised.
- Close out untracked deliverable assets once the user confirms the final SRS
  and SDD package.
