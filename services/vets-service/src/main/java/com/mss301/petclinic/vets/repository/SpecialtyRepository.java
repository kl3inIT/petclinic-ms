package com.mss301.petclinic.vets.repository;

import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.vets.model.Specialty;

public interface SpecialtyRepository extends JpaRepository<Specialty, Long> {

    Optional<Specialty> findByNameIgnoreCase(String name);

    Set<Specialty> findByNameInIgnoreCase(Set<String> names);
}
