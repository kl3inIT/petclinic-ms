---
status: resolved
trigger: "sao bị lỗi ? Username hoặc password không đúng ? Thêm cái mắt để xem rõ mật khẩu nhé"
created: 2026-07-20
updated: 2026-07-20
---

# Inventory Login Invalid

## Symptoms

- Expected behavior: `inventory1` can sign in with the newly seeded development password.
- Actual behavior: The login form reports that the username or password is incorrect.
- Error message: `Username hoặc password không đúng`.
- Timeline: Started immediately after adding the inventory-manager seed.
- Reproduction: Submit the login form with `inventory1` and the configured development password.

## Current Focus

- hypothesis: Resolved — the live database lacked `inventory1`, and the original seed UUID collided with `warehouse1`.
- test: Completed runtime insert, direct and gateway login verification, idempotent seed replay, and focused auth-service tests.
- expecting: Satisfied — both login paths return `inventory1` with `INVENTORY_MANAGER`, and the changeset can be replayed safely.
- next_action: none
- reasoning_checkpoint: Runtime data and persistent changeset are corrected and verified.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-07-20T00:13:51+07:00
  observation: `auth-service` is not a Docker container; it is an IntelliJ-launched Java process listening on 8183/9183 and started at 2026-07-19 22:38:03.
  implication: Docker has no auth-service logs for this runtime, and the process predates the new seed file.
- timestamp: 2026-07-20T00:13:51+07:00
  observation: Changeset 009 and its master-changelog include were written at 2026-07-20 00:03:23, after the running auth-service started.
  implication: The already-running process could not execute the newly added Liquibase changeset.
- timestamp: 2026-07-20T00:13:51+07:00
  observation: PostgreSQL contains neither an `auth.users` row for `inventory1` nor a `DATABASECHANGELOG` row for `009-001-seed-dev-inventory-manager`.
  implication: The login failure is caused by missing runtime seed data, not role mapping or account state.
- timestamp: 2026-07-20T00:13:51+07:00
  observation: Independent BCrypt verification confirms the stored seed hash matches `inventory123`.
  implication: The declared credential is internally consistent.
- timestamp: 2026-07-20T00:13:51+07:00
  observation: Direct POST to the live auth-service returns HTTP 400 with error key `invalid-credentials` before the runtime seed is applied.
  implication: The reported UI error is reproduced at the owning backend boundary.
- timestamp: 2026-07-20T00:16:00+07:00
  observation: Applying the proposed seed row failed atomically because UUID `11111111-1111-1111-1111-000000000009` already belongs to the existing `warehouse1` account; username `inventory1` remains absent.
  implication: Restarting auth-service with the original changeset would fail Liquibase rather than create the account, so the seed UUID must also be corrected.
- timestamp: 2026-07-20T00:17:00+07:00
  observation: The changeset UUID was corrected to unused value `11111111-1111-1111-1111-000000000010`, and exactly one runtime `inventory1` row was inserted with role `INVENTORY_MANAGER` and enabled state true.
  implication: The currently running development environment now contains the intended account without modifying unrelated users.
- timestamp: 2026-07-20T00:17:00+07:00
  observation: Login succeeds through both `http://localhost:8183` and API Gateway `http://localhost:8180`, returning username `inventory1` and role `INVENTORY_MANAGER`; token values were not printed.
  implication: Credential verification, account loading, role parsing, token generation, and gateway routing all work end to end.
- timestamp: 2026-07-20T00:18:00+07:00
  observation: Replaying the corrected seed SQL returns `INSERT 0 0`, and `:services:auth-service:test` completed successfully.
  implication: A later Liquibase run is idempotent against the runtime-inserted row, and focused regressions pass.

## Eliminated

- hypothesis: The password written in the changeset does not match `inventory123`.
  reason: BCrypt verification returned true.
- hypothesis: The account exists but is disabled or has an incorrect role.
  reason: No `inventory1` row exists in the live database.

## Resolution

- root_cause: The IntelliJ-launched auth-service process started before changeset 009 was created, so Liquibase never seeded the live database. Additionally, the changeset's original deterministic UUID was already owned by `warehouse1`, which would have caused a Liquibase primary-key failure after restart.
- fix: Changed only the new inventory-manager seed UUID from suffix `000009` to unused suffix `000010`, then inserted that exact account row into the currently running development database.
- verification: BCrypt hash matches `inventory123`; database row is enabled with `INVENTORY_MANAGER`; direct auth-service and API Gateway logins succeed; seed replay is a no-op; auth-service tests pass (`BUILD SUCCESSFUL`).
- files_changed: `services/auth-service/src/main/resources/db/changelog/changes/009-seed-dev-inventory-manager.yaml`; debug session record.
