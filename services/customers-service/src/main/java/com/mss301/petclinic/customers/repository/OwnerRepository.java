package com.mss301.petclinic.customers.repository;

import com.mss301.petclinic.customers.model.Owner;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OwnerRepository extends JpaRepository<Owner, Long> {

    Page<Owner> findByLastNameContainingIgnoreCase(String lastName, Pageable pageable);
}
