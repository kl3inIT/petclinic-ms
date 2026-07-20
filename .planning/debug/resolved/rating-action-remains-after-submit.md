# Debug session: Rating action remains after submit

## Symptom

- A customer can still see and open the rating action after successfully rating a completed visit.
- Expected: the completed visit is visibly marked as rated and cannot be rated again, including after a page reload.

## Reproduction

1. Sign in as a customer with a completed, paid visit.
2. Open the visit history and submit a rating successfully.
3. Return to or reload the visit history.
4. Observe that the rating action is still available.

## Initial hypotheses

1. The visit list renders the action from visit status only and does not reconcile existing ratings.
2. The rating mutation does not invalidate/refetch the query that drives the visit action state.
3. The backend rating contract may not expose a stable visit-to-rating association, requiring a contract-level correction rather than transient client state.

## Exit criteria

- Existing ratings are fetched from persistent backend state and associated with the correct visit/rating scope.
- A rated item shows a non-interactive rated state and cannot submit a duplicate rating.
- The state remains correct after reload.
- Focused automated tests and the Playwright clinical journey cover the regression.

## Status

Resolved. The focused checks and the complete Playwright clinical journey pass.

## Evidence and root cause

- `CustomerVisitRow` and `CustomerVisitDetailDialog` derived eligibility only
  from `COMPLETED + vetId`; neither read ratings from persistent state.
- `RateVetDialog` and `RatingServiceImpl` explicitly implemented UPSERT, so the
  action remained available after reload and a repeated request overwrote the
  original rating.
- The durable scope already enforced by the database is one rating per
  `(vet_id, customer_name)`, so the corrected behavior is one immutable rating
  per customer and veterinarian.

## Resolution

- Added paginated customer-rating reconciliation and a dedicated TanStack Query
  cache key. It checks every ratings page rather than assuming the customer is
  present on page one.
- Successful submission seeds that cache immediately. Rated visit rows/details
  show a disabled `Đã đánh giá` state; the dialog cannot be reopened.
- Duplicate backend POST now returns HTTP 400 with
  `errorKey=already-rated`, preserves the original rating and publishes no new
  event. The database unique constraint remains the concurrent-write guard.
- Updated service/frontend specs and mirrored test matrices.
- The full parallel browser suite exposed that generated `Pageable` objects
  were serialized as `pageable[page]`/`pageable[size]`, so Spring silently used
  its default 20-row page and could hide a newly created visit. The shared API
  serializer now flattens `page`, `size` and repeated `sort` parameters, with a
  deterministic secondary `id` sort for customer visit history.

## Verification

- PASS: `pnpm --filter @petclinic/web typecheck`.
- PASS: focused Vitest, 2 files / 4 tests.
- PASS: `pnpm --filter @petclinic/web lint`.
- PASS: `RatingControllerIT`, 20/20 tests; Gradle build successful.
- Playwright attempt 1 stopped before rating: accumulated visits caused the new
  visit to fall outside the default 20-row runtime response.
- Playwright attempt 2 stopped before rating: after filtering to `Đã đặt`, the
  row correctly disappeared when transitioned to `Đang khám`. The test now
  switches to the `Đang khám` filter.
- PASS: `pnpm --filter @petclinic/web test:e2e -- clinical-journey.spec.ts`,
  including the immediate `Đã đánh giá` state, absence of the rating action,
  and the same persisted state after page reload.
- PASS: focused Vitest after the serializer regression fix, 3 files / 6 tests.
- PASS: full Playwright suite, 4/4 tests (clinical, inventory and smoke).
