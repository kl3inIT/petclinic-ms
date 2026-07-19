# Web Frontend Spec

The web frontend lives in `apps/web`.

## Current Stack

- Vite 8, React 19.2, TypeScript 5.9.
- TanStack Router, Query, Form, and Table.
- Tailwind 4 and shadcn-style local UI components.
- orval-generated API client from the gateway OpenAPI aggregate.
- Playwright for e2e smoke and Vitest for unit/component tests.

## Current Functional Areas

- Auth routes: login and register.
- Admin routes: owners, pets, pet types, vets, visits, invoices, diseases,
  products, reviews, workflows, LLM config.
- Customer routes: dashboard, booking, visits, pets, profile sections, store.
- Vet routes: dashboard, visits, schedule, profile, ratings, badges, settings.
- AI chat components and workflow designer/monitoring UI.
- Invoice editing is scoped by the operational screen: the vet dialog can add
  treatment lines but hides retail merchandise, while the cashier invoice
  screen can add retail/manual charges and checkout but hides treatment-by-disease.

## Contract

Generated API code lives under `apps/web/src/lib/api/generated/`. Do not edit
it directly. Backend API changes must flow through OpenAPI fetch, orval
generation, and typecheck.
