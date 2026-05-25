package com.mss301.petclinic.customers.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.customers.model.PetType;

public interface PetTypeRepository extends JpaRepository<PetType, Long> {

    List<PetType> findAllByOrderByDisplayOrderAscNameAsc();

    Optional<PetType> findByCode(String code);
}
