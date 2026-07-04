package com.mss301.petclinic.visits.saga;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitCompletionSagaRepository extends JpaRepository<VisitCompletionSaga, Long> {

    Optional<VisitCompletionSaga> findByEventId(UUID eventId);
}
