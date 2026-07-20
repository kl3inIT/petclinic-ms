# 0004 - Inventory Operations Stay In Products Service

Status: accepted

## Context

Product stock is currently updated by individual HTTP calls from billing and
visits. Those calls are not atomic for multi-line requests, have no durable
idempotency key, and do not leave an inventory ledger. A remote update can
therefore succeed while the caller fails or retries.

## Decision

- `products-service` remains the owner of catalog and inventory. A separate
  inventory deployable is not introduced.
- Every stock mutation is represented by one durable inventory operation and
  one or more append-only stock movements.
- Cross-service consumers use an atomic batch API with a caller-supplied,
  unique idempotency key.
- Product rows are locked in stable identifier order while a batch is
  validated and applied. A batch either applies every line or none.
- Existing single-product consume/restock endpoints remain compatibility
  adapters over the same operation service.
- Product deletion is logical deactivation. Historical products are not
  physically removed through the public API.

## Consequences

- Billing retries use `invoice:{invoiceId}:checkout` and cannot decrement stock
  twice.
- Prescription callers must provide a stable idempotency key when catalog
  medication is dispensed.
- Inventory history can be audited without reconstructing it from invoices or
  logs.
- A later reservation/outbox increment can extend the operation lifecycle
  without changing stock ownership or the ledger contract.
