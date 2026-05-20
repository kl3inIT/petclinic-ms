package com.mss301.petclinic.visits.saga;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationSagaRepository extends JpaRepository<NotificationSaga, Long> {

    Optional<NotificationSaga> findByEventId(UUID eventId);
}
