# Frontend Contracts

The frontend is contract-driven. Backend endpoints produce OpenAPI; the gateway
aggregates specs; orval generates typed functions and TanStack Query hooks.

## Pipeline

```bash
pnpm --filter @petclinic/web fetch:openapi
pnpm --filter @petclinic/web generate:api
pnpm --filter @petclinic/web typecheck
```

- `apps/web/scripts/fetch-openapi.ts` fetches service specs from the gateway and
  writes `apps/web/openapi/petclinic-api.json`.
- `apps/web/orval.config.ts` generates code into
  `apps/web/src/lib/api/generated/`.
- `apps/web/src/lib/api/mutator.ts` preserves the shared axios client behavior.

## Rules

- Do not hand-edit generated files.
- Backend controller method names must be unique across all aggregated services.
- Spring `Pageable` parameters appear as nested `pageable` objects in generated
  params.
- Keep `apiClient.baseURL` empty because generated URLs already start with
  `/api/v1/...`.
- Feature-specific labels, colors, schemas, and helpers live next to the
  feature, not in generated code.
