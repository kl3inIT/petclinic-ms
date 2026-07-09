# Shared Library Specs

Shared libraries are Spring Boot auto-configuration modules. They provide
cross-cutting mechanics only; domain ownership remains in services.

| Module | Ownership |
|---|---|
| `common-web` | ProblemDetail exception translation, base exceptions, OpenAPI customizer. |
| `common-jpa` | Auditing base entity, auditor provider, enum helpers, data exception translation. |
| `common-security` | JWT/resource server defaults and endpoint security customizers. |
| `common-clients` | Plain and load-balanced RestClient builders plus JWT forwarding. |
| `common-events` | RabbitMQ events, queues, publisher, saga envelopes. |
| `common-testing` | Testcontainers and JWT testing helpers. |
