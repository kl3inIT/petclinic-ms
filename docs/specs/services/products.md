# Products And Inventory Service Spec

## Ownership

`products-service` owns the product catalog, on-hand stock and the append-only
inventory ledger. `SERVICE` products are not stock tracked. `MEDICATION`,
`VACCINE`, `SUPPLY`, and `MERCHANDISE` are stock tracked. Vaccines remain a
separate catalog type so their inventory can be filtered and controlled
independently from general medication.

## Invariants

- Stock quantity and reorder level never become negative.
- Inactive products cannot be consumed or restocked.
- A batch stock operation succeeds for every requested product or for none.
- Duplicate product lines in a batch are aggregated before validation.
- Repeating a completed operation with the same idempotency key returns the
  original result and does not mutate stock again.
- Reusing an idempotency key with a different payload is rejected.
- Every successful stock mutation creates a stock movement containing the
  before quantity, signed delta, after quantity, source and reason.
- Manual receipt and issue documents contain 1–100 product lines, require a
  positive quantity per line and a document-level reason, and store an optional
  external reference. Duplicate product lines are aggregated defensively.
- Every product in a document is locked and validated before the first stock
  mutation; one invalid line rejects the entire document.
- Non-zero stock entered during product creation is recorded as an `INITIAL`
  operation; catalog updates cannot directly overwrite stock.
- The public delete endpoint deactivates a product instead of deleting its row.

## Cross-Service Contract

Billing consumes merchandise with one batch operation keyed by
`invoice:{invoiceId}:checkout`. Payment input is validated before inventory is
called, and inventory failure prevents the invoice from becoming paid.

Visits consumes catalog medication with a caller-provided idempotency key.
Inventory failure prevents the prescription transaction from completing. A
retry of the same prescription command returns the existing prescription and
does not consume stock again. The prescription billing event is persisted as a
pending saga and retried after commit until billing acknowledges it.

## Compatibility

The existing `POST /api/v1/products/{id}/consume` and `/restock` endpoints stay
available and delegate to the inventory operation service. New integrations
use `POST /api/v1/products/stock/consume`.

Inventory managers and administrators use
`POST /api/v1/products/stock/documents` for multi-line manual receipt and issue
documents. They
can read the consolidated ledger through `GET /api/v1/products/stock/movements`
and the product-specific ledger through
`GET /api/v1/products/stock/{productId}/movements`.

The web inventory surface is a separate `/inventory` portal. Its catalog and
ledger live under `/inventory/products`; inventory users are not routed through
the administrative portal.

Catalog reads are public for the storefront. Movement history and every write
operation remain role protected.

## Current Scope Boundary

The current ledger tracks the aggregate on-hand quantity per product. It does
not yet track warehouse locations, suppliers or purchase orders, lot/batch
numbers, expiry dates, FEFO allocation, stocktake adjustments, cold-chain
temperature records, or a separate controlled-drug register.
