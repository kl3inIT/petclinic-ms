package com.mss301.petclinic.vets.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.mss301.petclinic.vets.model.Vet;

public interface VetRepository extends JpaRepository<Vet, Long>, JpaSpecificationExecutor<Vet> {

    Page<Vet> findByLastNameContainingIgnoreCase(String lastName, Pageable pageable);
}
