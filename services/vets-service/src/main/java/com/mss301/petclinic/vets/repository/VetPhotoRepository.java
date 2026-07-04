package com.mss301.petclinic.vets.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.mss301.petclinic.vets.model.VetPhoto;

public interface VetPhotoRepository extends JpaRepository<VetPhoto, Long> {
    // Sử dụng findById(vetId) trực tiếp vì vetId == PK

    /**
     * Projection — chỉ trả object key, KHÔNG hydrate full entity. Dùng cho file cleanup
     * orphan cleanup job (review item M1): scale 10K vet thì findAll().map(getObjectKey)
     * load hết entity vào RAM, projection nhẹ hơn hàng order-of-magnitude.
     */
    @Query("SELECT p.objectKey FROM VetPhoto p")
    List<String> findAllObjectKeys();

    /** Tìm photo theo status (PENDING/APPROVED/REJECTED) — admin review queue. */
    List<VetPhoto> findByStatus(String status);
}
