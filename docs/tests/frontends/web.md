# Web Test Matrix

This matrix records current frontend test coverage shape.

| Area | Automated evidence | Gap |
|---|---|---|
| Type contract | `pnpm --filter @petclinic/web typecheck` runs generated routes and TypeScript. | Must be rerun after backend OpenAPI changes. |
| Unit/component | Vitest is configured. | Coverage breadth needs review per feature. |
| Browser smoke | `apps/web/e2e/smoke.spec.ts` checks landing and login route accessibility. | Full flows for login, admin products, visit booking, checkout, workflow, and role routes are not covered yet. |
| Invoice screen scope | The shared invoice editor exposes treatment and retail sections independently; the vet dialog hides retail and the cashier screen hides treatment. | Add role-screen component or browser coverage. |

Use `docs/guidelines/testing-harness.md` for commands.
