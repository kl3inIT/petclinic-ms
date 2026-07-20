package com.mss301.petclinic.products.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.products.model.InventoryOperation;

public interface InventoryOperationRepository extends JpaRepository<InventoryOperation, Long> {
    Optional<InventoryOperation> findByIdempotencyKey(String idempotencyKey);
}
