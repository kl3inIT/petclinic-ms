# Web Test Matrix

This matrix records current frontend test coverage shape.

| Area | Automated evidence | Gap |
|---|---|---|
| Type contract | `pnpm --filter @petclinic/web typecheck` runs generated routes and TypeScript. | Must be rerun after backend OpenAPI changes. |
| Unit/component | Vitest is configured. | Coverage breadth needs review per feature. |
| Browser smoke | `apps/web/e2e/smoke.spec.ts` checks landing and login route accessibility. | Full flows for login, admin products, visit booking, checkout, workflow, and role routes are not covered yet. |

Use `docs/guidelines/testing-harness.md` for commands.
