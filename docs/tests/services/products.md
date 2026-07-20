# Products And Inventory Test Matrix

| Behavior | Status | Evidence |
|---|---|---|
| Product stock invariant | Covered | `ProductTest` covers consume, restock, inactive products and overflow. |
| Vaccine catalog compatibility | Covered | `ProductTest.vaccineIsStockTracked` and the products migration preserve `VACCINE` as a stock-tracked type, including existing ledger history. |
| Batch all-or-none validation | Covered at service level | `InventoryServiceImplTest.validatesEntireBatchBeforeFirstMutation`. PostgreSQL rollback coverage remains pending. |
| Idempotency and conflict | Covered | `InventoryServiceImplTest` verifies replay mutates once and conflicting payload is rejected. |
| Initial stock ledger path | Covered | `ProductServiceImplTest` verifies initial stock is routed through `initializeStock`. |
| Concurrency | Pending integration environment | Add concurrent PostgreSQL operations and assert no oversell/negative balance. |
| Ledger movement values | Covered at service level | Batch test asserts before, signed delta and after values. |
| Multi-line receipt document | Covered at service level | `InventoryServiceImplTest.manualInboundAggregatesLinesAndRecordsOneDocument` verifies aggregation, multiple movements and shared document audit data. |
| Multi-line issue atomicity | Covered at service level | `InventoryServiceImplTest.manualOutboundValidatesEveryLineBeforeMutatingStock` verifies one insufficient line leaves every product unchanged. |
| Consolidated ledger query | Covered end to end | `inventory-flow.spec.ts` requires a successful 50-row ledger response and verifies the two-line receipt and issue entries, including compatibility with historical vaccine movements. A focused repository test remains useful for deterministic tie ordering. |
| Authorization | Covered in browser | `inventory-flow.spec.ts` logs in as `INVENTORY_MANAGER` and exercises the protected dashboard, document writes and ledger read through the gateway. |
| Billing integration | Covered | `InvoiceServiceImplTest` verifies validation ordering, aggregation/stable key and OPEN state on inventory failure. |
| Prescription integration | Covered | `PrescriptionServiceImplTest` verifies inventory failure aborts before PDF and idempotent retry consumes once. |
| Prescription billing retry | Covered | `PrescriptionBillingOutboxJobTest` verifies pending events reuse the original event ID and record publish attempts. |
| Migration startup | Covered | `ProductsServiceApplicationTests` starts PostgreSQL with Testcontainers and applies the Liquibase changelog successfully. Explicit backfill/constraint assertions remain to be added. |
