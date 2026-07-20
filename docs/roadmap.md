# petclinic-ms Roadmap

Status reflects the repository state inspected on 2026-07-20. It is a progress
tracker, not the architecture source of truth.

## Current Progress

| Area | Status | Evidence |
|---|---|---|
| Course documents | Done, pending final human review | `docs/SDD_PCMS_v1.0.docx`, `docs/MSS301-SRS.docx`, `docs/SRS_PCMS_v1.0.docx`, generated diagrams under `docs/diagrams/`. |
| Documentation harness | In progress | Thin root maps plus source-of-truth Markdown docs added. |
| Spring Cloud foundation | Implemented | Config Server, Eureka, Gateway, Admin Server, shared config repo, compose, k8s base manifests. |
| Shared libraries | Implemented | `common-web`, `common-jpa`, `common-security`, `common-clients`, `common-events`, `common-testing`. |
| Core domain services | Implemented in code | Auth, customers, vets, visits, reviews, billing, products. |
| Inventory hardening | Implemented; advanced traceability and concurrency validation pending | Atomic/idempotent batch consumption, audited multi-line receipts/issues, consolidated append-only ledger, inventory dashboard, medication/vaccine/supply/service/retail navigation, soft deletion, prescription/checkout integration, focused unit tests, PostgreSQL migration test and Playwright role journey. |
| AI/workflow/MCP | Implemented in code | `genai-service`, `workflow-service`, `mcp-server`, Camunda/BPMN frontend. |
| Polyglot support | Implemented in code | Go `mailer-service` and Go `files-service`. |
| Frontend | Substantial implementation | Admin, customer, vet, store, workflow, AI, generated API client, TanStack forms/routes/query. |
| Deployment assets | Implemented but needs deployment validation | Compose profiles and Kubernetes base manifests exist. |
| Automated tests | Partial; critical clinical and inventory journeys covered | Unit/integration tests exist across services. Playwright covers smoke, the cross-role pet booking → vet exam/prescription → cashier checkout → customer invoice/clinical detail → rating journey, and inventory dashboard → multi-line receipt → multi-line issue → ledger reconciliation. Full route breadth is not complete. |

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
- End-to-end browser coverage now protects the primary clinical/billing and
  inventory journeys, but remains narrow compared with all admin and workflow routes.
- Some generated/new course diagram assets are untracked in the working tree.

## Backlog

- Inventory remains folded into `products-service` per ADR 0004; decide the
  cart boundary separately when real store checkout enters scope.
- Add per-service spec files when a service changes next, starting with visits,
  billing, products, reviews, files, and workflow.
- Expand Playwright coverage for admin product CRUD, workflow
  design/operations and remaining role routes.
- Add deployment validation notes after the compose/k8s stack is exercised.
- Add PostgreSQL/Testcontainers concurrency and migration tests for inventory
  once Docker is available, then validate reservation/reconciliation needs
  under failure injection.
- Extend clinical inventory traceability in bounded increments: supplier and
  purchase-order receipts; lot/batch and expiry tracking with FEFO allocation;
  physical stocktake with signed reconciliation adjustments; cold-chain
  storage and temperature logs for vaccines; and a segregated controlled-drug
  register with witness/reconciliation fields. Confirm local legal and hospital
  policy requirements before treating these workflows as compliance-ready.
- Close out untracked deliverable assets once the user confirms the final SRS
  and SDD package.
