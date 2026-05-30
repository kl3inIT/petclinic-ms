package com.mss301.petclinic.vets.model;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

/**
 * Composite PK cho {@link WorkScheduleSlot}: (vet_id, workday, work_hour).
 * Phải implement {@link Serializable} (JPA requirement) và override equals/hashCode
 * (Hibernate dùng để dedupe slot trong session).
 */
@Embeddable
public class WorkScheduleSlotId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "vet_id", nullable = false)
    private Long vetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Workday workday;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_hour", nullable = false, length = 20)
    private WorkHour workHour;

    protected WorkScheduleSlotId() {
        // JPA requires no-arg constructor
    }

    public WorkScheduleSlotId(Long vetId, Workday workday, WorkHour workHour) {
        this.vetId = vetId;
        this.workday = workday;
        this.workHour = workHour;
    }

    public Long getVetId() { return vetId; }
    public Workday getWorkday() { return workday; }
    public WorkHour getWorkHour() { return workHour; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof WorkScheduleSlotId other)) return false;
        return Objects.equals(vetId, other.vetId)
                && workday == other.workday
                && workHour == other.workHour;
    }

    @Override
    public int hashCode() {
        return Objects.hash(vetId, workday, workHour);
    }
}
