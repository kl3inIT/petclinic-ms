package com.mss301.petclinic.customers.repository;

import com.mss301.petclinic.customers.model.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PetRepository extends JpaRepository<Pet, Long> {
}
