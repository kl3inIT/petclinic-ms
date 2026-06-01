package com.mss301.petclinic.billing.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.mss301.petclinic.billing.model.Disease;

public interface DiseaseRepository
        extends JpaRepository<Disease, Long>, JpaSpecificationExecutor<Disease> {

    Optional<Disease> findByCode(String code);

    boolean existsByCode(String code);
}
