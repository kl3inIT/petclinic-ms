# Agent Workflow

Use this file for reusable agent mechanics. Current architecture facts live in
`ARCHITECTURE.md`; code style lives in `docs/conventions.md`.

## Reading Order

1. Read `AGENTS.md` or `CLAUDE.md`.
2. Read `ARCHITECTURE.md`.
3. Read the relevant spec under `docs/specs/`.
4. Read the relevant test matrix under `docs/tests/`.
5. Read only the guideline files needed for the task.

## Change Discipline

- Keep root guidance files thin.
- If behavior changes, update the durable spec and test matrix in the same
  change.
- If a reusable platform mechanic is discovered, update `docs/guidelines/`.
- If a significant hard-to-reverse choice is made, add a decision file under
  `docs/decisions/`.
- Do not use completed increment docs as current behavior.

## Tooling Expectations

- Use `rg` or `rg --files` first for repo search.
- For frontend work, verify with Playwright/browser evidence when behavior or
  layout matters.
- For Spring config changes, inspect YAML carefully because many errors are
  runtime-only.
- For version-sensitive Spring, Gradle, Testcontainers, OpenAPI, or frontend
  library usage, verify against current documentation before coding.
