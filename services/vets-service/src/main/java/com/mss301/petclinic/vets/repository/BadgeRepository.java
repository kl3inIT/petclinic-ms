package com.mss301.petclinic.vets.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.vets.model.Badge;

public interface BadgeRepository extends JpaRepository<Badge, Long> {

    Page<Badge> findByVetId(Long vetId, Pageable pageable);

    Optional<Badge> findByIdAndVetId(Long id, Long vetId);
}
