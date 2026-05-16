# PetClinic Frontend

React 19.2 + Vite 8 (Rolldown) + TanStack Router/Query + Tailwind v4 + shadcn (canary) + orval.

## Quick start

```bash
pnpm install
pnpm --filter @petclinic/web dev          # http://localhost:3000
```

Yêu cầu backend (gateway) chạy ở `http://localhost:8080` — Vite proxy `/api/*` về gateway.

## Scripts

| Lệnh | Mô tả |
|---|---|
| `pnpm --filter @petclinic/web dev` | Dev server, HMR, TanStack Router file-based codegen |
| `pnpm --filter @petclinic/web build` | Type-check + production build (Rolldown sau khi Vite 8 stable) |
| `pnpm --filter @petclinic/web preview` | Preview build local |
| `pnpm --filter @petclinic/web lint` | ESLint 9 flat config |
| `pnpm --filter @petclinic/web typecheck` | `tsc -b --noEmit` |
| `pnpm --filter @petclinic/web test` | Vitest (unit) |
| `pnpm --filter @petclinic/web test:e2e` | Playwright (E2E) |
| `pnpm --filter @petclinic/web fetch:openapi` | Download spec từ gateway → `openapi/petclinic-api.json` |
| `pnpm --filter @petclinic/web generate:api` | orval đọc spec → sinh hooks + types vào `src/lib/api/generated/` |

## Folder

```
src/
├── routes/                ← TanStack Router file-based (auto-gen routeTree.gen.ts)
│   ├── __root.tsx
│   ├── index.tsx          ← landing /
│   ├── _auth.tsx          ← layout login/register
│   ├── _auth.login.tsx
│   ├── _auth.register.tsx
│   ├── admin.tsx          ← layout sidebar Jmix-like + role guard
│   ├── admin.index.tsx    ← /admin
│   ├── admin.owners.tsx
│   ├── admin.pets.tsx
│   └── admin.vets.tsx
├── features/              ← FEATURE slice (mỗi domain self-contained)
│   └── auth/
│       ├── api.ts         ← manual axios calls (sẽ thay bằng orval gen)
│       ├── schemas.ts     ← Zod cho form
│       └── store.ts       ← zustand session (persist localStorage)
├── components/ui/         ← shadcn primitives
├── lib/
│   ├── api/
│   │   ├── client.ts      ← axios + JWT refresh interceptor
│   │   ├── mutator.ts     ← orval mutator
│   │   └── generated/     ← orval output (gitignored bằng convention, không commit nếu CI gen)
│   ├── query-client.ts
│   └── utils.ts           ← cn() (shadcn)
├── styles/globals.css     ← Tailwind v4 @theme, design tokens
└── main.tsx               ← entry: QueryClient + RouterProvider + Toaster + Devtools
```

## Workflow khi BE đổi DTO

```bash
# 1. Start gateway + services
./gradlew :services:api-gateway:bootRun

# 2. FE tải spec mới + regen
pnpm --filter @petclinic/web fetch:openapi
pnpm --filter @petclinic/web generate:api

# 3. Compile FE — TypeScript báo lỗi nơi nào dùng field bị đổi
pnpm --filter @petclinic/web typecheck
```

## Notes

- **Manual API** ở `features/auth/api.ts` chỉ là **proof of life**. Sau khi gateway expose aggregate `/v3/api-docs` (cần config springdoc gateway routes), orval sẽ gen replacement.
- **Tailwind v4 + shadcn canary** dùng `data-slot` thay vì `forwardRef`. Nếu copy thêm component từ `npx shadcn@latest add ...` chú ý chọn theme `new-york`.
- **TanStack Router file-based:** đặt route mới ở `src/routes/`, plugin tự gen `routeTree.gen.ts`. **Đừng** sửa tay file gen.

## Thêm app/package mới trong monorepo

```bash
# App mới (e.g. BPM workflow editor)
mkdir -p apps/bpm
cp apps/web/{package.json,tsconfig*.json,vite.config.ts,...} apps/bpm/
# Đổi package name thành @petclinic/bpm, port khác (3001), ...

# Shared package (e.g. design tokens, API client, UI lib)
mkdir -p packages/ui
# package.json: "name": "@petclinic/ui"
# Trong apps/web/package.json thêm: "@petclinic/ui": "workspace:*"
```

Sau đó `pnpm install` ở root để pnpm link workspace deps. Turbo tự cache build.
