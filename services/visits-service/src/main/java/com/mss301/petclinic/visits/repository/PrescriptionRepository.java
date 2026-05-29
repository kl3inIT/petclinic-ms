package com.mss301.petclinic.visits.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.visits.model.Prescription;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    Optional<Prescription> findByVisitId(Long visitId);

    boolean existsByVisitId(Long visitId);
}
