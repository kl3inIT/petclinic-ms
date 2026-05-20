package com.mss301.petclinic.customers.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.customers.model.Owner;

public interface OwnerRepository extends JpaRepository<Owner, Long> {

    Page<Owner> findByLastNameContainingIgnoreCase(String lastName, Pageable pageable);
}
