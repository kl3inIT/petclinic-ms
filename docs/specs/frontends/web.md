# Web Frontend Spec

The web frontend lives in `apps/web`.

## Current Stack

- Vite 8, React 19.2, TypeScript 5.9.
- TanStack Router, Query, Form, and Table.
- Tailwind 4 and shadcn-style local UI components.
- orval-generated API client from the gateway OpenAPI aggregate.
- Playwright for browser smoke and cross-role clinical e2e flows, plus Vitest
  for unit/component tests.

## Current Functional Areas

- Auth routes: login and register. The login password field is masked by
  default and provides an accessible visibility toggle.
- Admin routes under `/admin`: system dashboard, owners, pets, pet types, vets,
  visits, invoices, diseases, reviews, workflows and LLM config.
- Reception routes under `/staff`: operational dashboard, appointments, owners,
  pets and the cashier invoice screen. STAFF does not receive clinical actions,
  veterinarian administration, moderation, inventory or system configuration menus.
- Inventory routes under `/inventory`: warehouse dashboard, product catalogs,
  receipt/issue documents, low-stock view and the consolidated ledger. The legacy
  `/admin/products` URL redirects to the inventory portal.
- Customer routes: dashboard, booking, visits, pets, profile sections, store.
- Completed customer visits reconcile ratings from persistent backend state.
  Once the customer has rated a veterinarian, every applicable visit shows a
  non-interactive `Đã đánh giá` state immediately and after reload; the rating
  dialog cannot be reopened for that veterinarian.
- Vet routes: dashboard, visits, schedule, profile, ratings, badges, settings.
- AI chat components and workflow designer/monitoring UI.
- Invoice editing is scoped by the operational screen: the vet dialog can add
  treatment lines but hides retail merchandise, while the cashier invoice
  screen can add retail/manual charges and checkout but hides treatment-by-disease.
  While the vet invoice remains open, its detail polls automatically because
  visit-fee and prescription lines arrive through independent asynchronous
  events; users do not need to repeatedly press refresh to see late medication.
- Customer payment history exposes an expandable detail for every paid or
  cancelled invoice. It shows each charge type, description, unit price,
  quantity, line total and grand total, including retail products added by the
  cashier. Visit-fee references are resolved on
  demand through the owner-authorized visit-detail endpoint so the same view
  also shows the related pet, visit date, reason, diagnosis, treatment and fee.
  An unavailable clinical record does not hide the invoice's financial lines.
- Landing and Store share one public header contract: the same `max-w-7xl`
  container, 80 px height, complete navigation, hotline, authentication-aware
  portal action, and accessible mobile menu. Landing uses a full-width hospital
  hero immediately below the fixed header. All landing photography is served
  from versioned local assets with unique files for the care journey, each
  doctor, each service group, each facility, and the appointment journey; image
  failures use a local fallback. The trust, service, and appointment sections
  use photo-led editorial layouts instead of repeated icon-card grids, while
  testimonials use lightweight UI avatars. The public landing page has no
  third-party image-host dependency.
- Store is a read-only catalog for active `MERCHANDISE` products from
  `products-service`. It exposes reference prices and stock status, but no
  cart, online order, delivery, or online payment actions; purchases are made
  and paid for directly at the clinic counter. Store images are local assets
  mapped by product code. Every current catalog item has a distinct asset;
  unknown future codes render a named placeholder, while actual image load
  failures use a local fallback. The page does not depend on third-party image
  hosts. Category filters are derived from the catalog response rather than a
  fixed list.
- Inventory managers and administrators receive a warehouse dashboard with
  active-catalog, stock-tracked, low-stock, out-of-stock and estimated-value
  metrics, plus low-stock alerts and recent movements.
- Product administration is grouped into medication, vaccines, medical
  supplies, services and retail merchandise. Vaccines remain stock tracked but
  have an independent menu and filter. Separate navigation exposes low-stock
  items and the consolidated stock ledger.
- Manual receipt and issue documents have a document header and a dynamic
  1–100-line product table. Each line shows projected stock, prevents duplicate
  product selection and can be added or removed before posting. The form
  requires a document-level reason and accepts an optional external reference.
  Product-specific history and the paginated consolidated ledger show
  before/delta/after balances and shared document audit context. Product
  deactivation remains logical rather than destructive.

## Role Portals And Scheduling

- `ADMIN` lands on `/admin`, whose dashboard aggregates today's visits, open
  invoices, owner/pet/vet totals and pending veterinarian photos. Admin owns
  veterinarian profiles, work schedules, photo moderation and system configuration.
- `STAFF` lands on `/staff`. Staff is the reception/cashier role: it can book,
  list and cancel appointments, maintain owner/pet records and complete checkout.
  Starting/completing an examination and prescribing medication remain VET or
  ADMIN actions.
- `INVENTORY_MANAGER` lands on `/inventory` and only receives product and stock
  navigation. ADMIN may enter this separate portal through its quick action.
- `VET` lands on `/vet`; `USER` uses `/customer`.
- The menu formerly named `Duyệt thay đổi` is specifically veterinarian-photo
  moderation and is now labelled `Duyệt ảnh bác sĩ`; it does not approve schedules.
- Weekly veterinarian work schedules are currently edited directly by ADMIN on
  the veterinarian detail page. There is no veterinarian-submitted schedule-change
  approval workflow yet.
- Customer appointment rescheduling is not atomic yet. The current UI explicitly
  guides the customer to book a new appointment and then cancel the old one; staff
  can perform the same two reception actions, but no dedicated reschedule endpoint exists.

## Contract

Generated API code lives under `apps/web/src/lib/api/generated/`. Do not edit
it directly. Backend API changes must flow through OpenAPI fetch, orval
generation, and typecheck.

The shared Axios client serializes array query parameters as repeated keys
(`sort=a&sort=b`) so Spring pageable endpoints receive valid sorting parameters.
