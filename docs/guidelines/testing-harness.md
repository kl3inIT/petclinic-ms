# Testing Harness

This file describes how testing works across the project. Per-unit coverage
status lives under `docs/tests/`.

## Backend

- JUnit 5 is the Java test framework.
- Testcontainers is the integration-test default; do not replace PostgreSQL with
  H2 for persistence behavior.
- Liquibase stays enabled in service tests so migrations are tested.
- Shared test helpers live in `shared/common-testing`.
- Context-load tests are useful gates, but service behavior needs controller,
  service, and integration tests where contracts are non-trivial.

Useful commands:

```bash
./gradlew :services:customers-service:test
./gradlew :services:vets-service:test
./gradlew :services:visits-service:test
./gradlew build
```

## Go Services

```bash
cd services/mailer-service && go test ./...
cd services/files-service && go test ./...
```

## Frontend

- Unit/component tests run through Vitest.
- Browser flow checks run through Playwright.
- Generated API types are contract gates: after backend API changes, regenerate
  OpenAPI and run TypeScript typecheck.

Useful commands:

```bash
pnpm --filter @petclinic/web typecheck
pnpm --filter @petclinic/web test
pnpm --filter @petclinic/web test:e2e
```

## Current Known Gap

The repo has broad service-level tests and a Playwright smoke test, but it does
not yet have full end-to-end browser coverage across auth, admin, customer,
vet, workflow, checkout, and AI flows.
