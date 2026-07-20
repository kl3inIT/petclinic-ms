package com.mss301.petclinic.visits.saga;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.common.events.saga.SagaStatus;

public interface PrescriptionBillingSagaRepository extends JpaRepository<PrescriptionBillingSaga, Long> {

    Optional<PrescriptionBillingSaga> findByEventId(UUID eventId);

    List<PrescriptionBillingSaga> findTop100ByStatusAndUpdatedAtBeforeOrderByUpdatedAtAsc(
            SagaStatus status, Instant updatedBefore);
}
