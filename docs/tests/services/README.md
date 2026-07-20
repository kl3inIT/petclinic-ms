# Service Test Matrix

This matrix records coverage observed from the repository shape on 2026-07-09.
It is not a fresh test run result.

| Area | Automated evidence | Gap |
|---|---|---|
| Context load | `CustomersServiceApplicationTests` and `VetsServiceApplicationTests` load their Files clients through the shared `RestClient.Builder` auto-configuration. | Need current full `./gradlew build` result before release claims. |
| Customers | Unit, controller slice, and integration tests exist. | Broader e2e owner/pet browser flows still needed. |
| [Vets](vets.md) | Integration tests cover schedules, photos, albums, one-time ratings, badges, education and events. The cross-role browser journey covers rating persistence after reload. | Broader UI-driven vet settings coverage is still needed. |
| Visits | Service tests cover visit lifecycle and prescriptions; PDF generator tests exist. Completion-event unit coverage verifies billing publication continues when a workflow callback has no forwarded end-user JWT. | Cross-service saga/e2e coverage should be expanded. |
| Auth | Customer/vet link integration tests cover authorization, validation, uniqueness, and missing users. | Full auth browser flow and token refresh e2e coverage should be expanded. |
| Billing/products/reviews/genai/workflow | Service/context/unit tests exist in their modules. `genai-service` additionally locks the SSE UI Message Stream envelope (text, tool progress, safe error and `[DONE]`). | Run a provider-backed turn proving the open MCP transport can query the three token-free internal AI read models. |
| Go services | `go test ./...` is the expected gate. | Current run result not recorded here. |

Use `docs/guidelines/testing-harness.md` for commands and testing mechanics.
