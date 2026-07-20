# Vets Service Spec

## Access control

- Authenticated roles may read the public veterinarian and specialty catalogs.
- `VET` manages its own `/api/v1/vets/me/**` profile surface. `ADMIN` retains the
  explicit override.
- Creating or updating veterinarian records, replacing work schedules, managing
  sub-resources and approving/rejecting veterinarian photos are `ADMIN` actions.
- `STAFF` is a reception/cashier role and has no veterinarian write or moderation
  permission.
- The pending review queue contains veterinarian photos only. It is not a work
  schedule or appointment-change approval queue.

## Customer ratings

- Ratings are scoped by `(vetId, authenticated username)`; the username always
  comes from the JWT and cannot be supplied by the request body.
- A customer can create one immutable rating for each veterinarian. A repeated
  `POST /api/v1/vets/{vetId}/ratings` is rejected with HTTP 400 and
  `errorKey=already-rated`; it never overwrites the original score or comment.
- The database unique constraint `uk_ratings_vet_customer` is the final guard
  against concurrent duplicate submissions.
- Successful creation publishes one `vet.rating.added` event after commit. The
  legacy `updated` field remains in the event payload for compatibility and is
  always `false`.
