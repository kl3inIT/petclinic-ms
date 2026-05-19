package com.mss301.petclinic.vets.model;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * Một slot vet trực — composite PK (vet_id, workday, work_hour). KHÔNG extend
 * {@link com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity} vì là lookup table
 * (binary có/không), audit không có ý nghĩa nghiệp vụ ở granularity slot.
 */
@Entity
@Table(name = "vet_work_schedule")
public class WorkScheduleSlot {

    @EmbeddedId
    private WorkScheduleSlotId id;

    protected WorkScheduleSlot() {
        // JPA requires no-arg constructor
    }

    public WorkScheduleSlot(WorkScheduleSlotId id) {
        this.id = id;
    }

    public WorkScheduleSlot(Long vetId, Workday workday, WorkHour workHour) {
        this.id = new WorkScheduleSlotId(vetId, workday, workHour);
    }

    public WorkScheduleSlotId getId() { return id; }
    public Long getVetId() { return id.getVetId(); }
    public Workday getWorkday() { return id.getWorkday(); }
    public WorkHour getWorkHour() { return id.getWorkHour(); }
}
