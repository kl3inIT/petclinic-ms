# 0001 - Repository System Of Record

Status: accepted

## Context

The project had a large amount of durable guidance concentrated in root agent
files. That made every new session load too much context and mixed current
facts, plans, gotchas, and course deliverables in one place.

## Decision

Use the same lightweight harness as `D:\northstar`:

- root agent files are thin maps,
- `ARCHITECTURE.md` records current built facts,
- `docs/vision.md` records intent and scope,
- `docs/roadmap.md` tracks status,
- `docs/conventions.md` records code style,
- `docs/guidelines/` records reusable mechanics,
- `docs/specs/` and `docs/tests/` record current unit behavior and coverage,
- `docs/increments/` stores active/completed increment history.

## Consequences

Future code work must update the relevant durable docs when behavior changes.
Course deliverables remain in `docs/`, but they are no longer the primary agent
entrypoint.
