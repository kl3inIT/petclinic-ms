# Shared Library Test Matrix

| Module | Current coverage shape | Gap |
|---|---|---|
| `common-web` | Covered indirectly by service controller tests importing shared translators. | Add focused tests when exception contract changes. |
| `common-jpa` | Covered indirectly by service integration tests. | Add focused tests when enum/audit helpers change. |
| `common-security` | Covered indirectly by secured service tests. | Add focused tests when endpoint defaults change. |
| `common-clients` | Covered indirectly by services using HTTP interfaces. | Add tests when RestClient builder behavior changes. |
| `common-events` | Covered indirectly by event-publishing/consumer tests. | Add focused tests when queue/DLQ helpers change. |
| `common-testing` | Helper module. | Keep examples current when test harness changes. |
