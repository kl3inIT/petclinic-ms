# petclinic-ms Claude Map

This repository follows the lightweight documentation harness from
`D:\northstar\harness.md`: the repo is the system of record, this file is a
thin map, and detailed facts live in the linked docs.

## Start Here

- [ARCHITECTURE.md](ARCHITECTURE.md) - current built stack, deployables,
  module layout, runtime contracts, and commands.
- [docs/vision.md](docs/vision.md) - project intent, source composition, and
  scope boundaries.
- [docs/roadmap.md](docs/roadmap.md) - progress tracker for documents, coding,
  tests, and future backlog.
- [docs/conventions.md](docs/conventions.md) - code style and contribution
  conventions.
- [docs/guidelines/](docs/guidelines/) - reusable mechanics and gotchas for
  Spring, OpenAPI/codegen, testing, course deliverables, and agent workflow.
- [docs/decisions/](docs/decisions/) - append-only decision log.
- [docs/specs/](docs/specs/) - current behavior and contracts by long-lived
  unit.
- [docs/tests/](docs/tests/) - coverage matrix mirroring specs.
- [docs/increments/](docs/increments/) - active and completed increment history.

Course deliverables stay in `docs/*.docx`, `docs/*.html`, and
`docs/diagrams/`. They are deliverables or references, not the agent entrypoint.

## Workflow

- Start from this map, then open only the relevant source-of-truth docs.
- For code changes, update the affected spec and test matrix in the same change
  when durable behavior changes.
- Keep facts and rationale separate: current facts go in living docs; why a
  significant choice was made goes in `docs/decisions/`.
- Completed increment docs are history. Do not use them as current behavior.
- Preserve the user's working tree. Do not revert or clean unrelated changes.
- Do not run `gradle clean` unless the user explicitly asks.

## Fast Commands

```bash
./gradlew build
./gradlew :services:customers-service:test
docker compose --profile all up -d
pnpm --filter @petclinic/web typecheck
pnpm --filter @petclinic/web test:e2e
```

For current service-specific commands and ports, use [ARCHITECTURE.md](ARCHITECTURE.md).
