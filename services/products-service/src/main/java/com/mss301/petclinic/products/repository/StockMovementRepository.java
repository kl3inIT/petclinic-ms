package com.mss301.petclinic.products.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.mss301.petclinic.products.model.StockMovement;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    @EntityGraph(attributePaths = {"operation", "product"})
    List<StockMovement> findAllByOperationIdOrderById(Long operationId);

    @EntityGraph(attributePaths = {"operation", "product"})
    Page<StockMovement> findAllByProductId(Long productId, Pageable pageable);

    @EntityGraph(attributePaths = {"operation", "product"})
    @Query("select movement from StockMovement movement")
    Page<StockMovement> findAllWithDetails(Pageable pageable);
}
