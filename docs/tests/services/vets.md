# Vets Service Test Matrix

| Behavior | Automated evidence | Gap |
|---|---|---|
| Create rating | `RatingControllerIT` verifies JWT-owned identity, validation, location and response fields. | None. |
| One rating per customer and vet | `RatingControllerIT.addVetRating_sameCustomerTwice_rejectsDuplicateAndPreservesOriginal` verifies the second submission returns `error.already-rated` and cannot change the original aggregate. | A dedicated concurrent-insert integration test could exercise the database guard directly. |
| Rating event | `RatingEventPublishIT` verifies creation publishes after commit and a rejected duplicate publishes no second event. | Broker-failure retry remains best-effort by design. |
| Role boundary | Runtime endpoint configuration reserves veterinarian writes, work-schedule mutation and photo moderation for ADMIN; VET keeps its `/me` surface. | Add focused MockMvc authorization tests with the Config Server endpoint rules loaded; current controller ITs primarily exercise domain behavior with mock authentication. |
