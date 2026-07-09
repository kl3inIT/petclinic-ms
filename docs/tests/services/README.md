# Service Test Matrix

This matrix records coverage observed from the repository shape on 2026-07-09.
It is not a fresh test run result.

| Area | Automated evidence | Gap |
|---|---|---|
| Context load | `*ApplicationTests` exist across multiple Spring services. | Need current full `./gradlew build` result before release claims. |
| Customers | Unit, controller slice, and integration tests exist. | Broader e2e owner/pet browser flows still needed. |
| Vets | Integration tests cover schedules, photos, albums, ratings, badges, education, events. | Full UI-driven vet workflow coverage still needed. |
| Visits | Service tests cover visit lifecycle and prescriptions; PDF generator tests exist. | Cross-service saga/e2e coverage should be expanded. |
| Auth | Link customer/vet integration tests exist. | Full auth browser flow and token refresh e2e coverage should be expanded. |
| Billing/products/reviews/genai/workflow | Service/context/unit tests exist in their modules. | Per-service behavior matrices should be split when these services change next. |
| Go services | `go test ./...` is the expected gate. | Current run result not recorded here. |

Use `docs/guidelines/testing-harness.md` for commands and testing mechanics.
