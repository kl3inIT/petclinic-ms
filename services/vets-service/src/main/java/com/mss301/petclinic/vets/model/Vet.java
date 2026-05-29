package com.mss301.petclinic.vets.model;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

@Entity
@Table(name = "vets")
public class Vet extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "phone_number")
    private String phoneNumber;

    // Soft-deactivate: vet nghỉ việc set false, KHÔNG xoá vì còn lịch sử visit tham chiếu.
    @Column(nullable = false)
    private boolean active = true;

    @Column(columnDefinition = "TEXT")
    private String resume;

    /**
     * Mã thẻ bác sĩ — Postgres tự sinh từ id (xem changeset 012). Format
     * {@code PC-VET-{LPAD(id, 4, '0')}}. App KHÔNG write column này:
     * {@code insertable=false, updatable=false} + {@link Generated} để Hibernate
     * refresh value sau INSERT/UPDATE.
     */
    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "card_code", insertable = false, updatable = false, length = 20)
    private String cardCode;

    @ManyToMany(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
            name = "vet_specialties",
            joinColumns = @JoinColumn(name = "vet_id"),
            inverseJoinColumns = @JoinColumn(name = "specialty_id")
    )
    private Set<Specialty> specialties = new HashSet<>();

    protected Vet() {
        // JPA requires no-arg constructor
    }

    public Vet(String firstName, String lastName, String email) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
    }

    public Long getId() { return id; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getEmail() { return email; }
    public String getPhoneNumber() { return phoneNumber; }
    public boolean isActive() { return active; }
    public String getResume() { return resume; }
    public String getCardCode() { return cardCode; }
    public Set<Specialty> getSpecialties() { return specialties; }

    public void setFirstName(String firstName) { this.firstName = firstName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public void setEmail(String email) { this.email = email; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public void setActive(boolean active) { this.active = active; }
    public void setResume(String resume) { this.resume = resume; }
    public void setSpecialties(Set<Specialty> specialties) { this.specialties = specialties; }

    public void addSpecialty(Specialty specialty) { this.specialties.add(specialty); }
    public void removeSpecialty(Specialty specialty) { this.specialties.remove(specialty); }
}
