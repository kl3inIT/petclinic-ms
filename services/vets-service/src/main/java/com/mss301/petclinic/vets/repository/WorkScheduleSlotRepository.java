package com.mss301.petclinic.vets.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import com.mss301.petclinic.vets.model.WorkScheduleSlot;
import com.mss301.petclinic.vets.model.WorkScheduleSlotId;

public interface WorkScheduleSlotRepository extends JpaRepository<WorkScheduleSlot, WorkScheduleSlotId> {

    // Spring Data path qua @EmbeddedId: id.vetId → "IdVetId" trong derived method name
    List<WorkScheduleSlot> findByIdVetId(Long vetId);

    /**
     * Bulk delete theo vetId. {@link Modifying} + JPQL vì derived
     * {@code deleteByIdVetId} sẽ load từng entity rồi delete (N+1 SQL).
     * Một câu DELETE đủ — schedule slot không có cascade khác.
     */
    @Modifying
    @Query("delete from WorkScheduleSlot s where s.id.vetId = :vetId")
    int deleteAllByVetId(Long vetId);
}
