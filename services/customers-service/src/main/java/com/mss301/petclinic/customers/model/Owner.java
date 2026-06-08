package com.mss301.petclinic.customers.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

@Entity
@Table(name = "owners")
public class Owner extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Optimistic lock counter — Hibernate tự increment khi update; nếu DB row
     * version khác với entity version → throw {@link org.springframework.orm.ObjectOptimisticLockingFailureException}
     * → {@code shared/common-jpa/DataExceptionTranslator} map sang HTTP 409.
     */
    @Version
    private Long version;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String address;
    private String city;
    private String telephone;

    /** MinIO object key của avatar chủ nuôi (key {@code owners/<id>}). Null = chưa upload.
     *  Binary nằm ở MinIO; entity chỉ giữ key. Presigned URL sinh ở service layer. */
    @Column(name = "avatar_object_key", length = 255)
    private String avatarObjectKey;

    // Unidirectional one-to-many — Pet không có back-reference Owner để JSON serialize đơn giản.
    // nullable=false BẮT BUỘC: cột pets.owner_id là NOT NULL (liquibase 001). Không có nó,
    // Hibernate dùng insert-then-update (INSERT pet với owner_id=NULL rồi UPDATE set FK) →
    // vi phạm NOT NULL ngay khi thêm pet. Có nullable=false, Hibernate đưa owner_id vào
    // chính câu INSERT (1 statement). Pet.ownerId mirror để insertable/updatable=false.
    @OneToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "owner_id", nullable = false)
    private List<Pet> pets = new ArrayList<>();

    protected Owner() {
        // JPA requires no-arg constructor
    }

    public Owner(String firstName, String lastName, String address, String city, String telephone) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.address = address;
        this.city = city;
        this.telephone = telephone;
    }

    public Long getId() { return id; }
    public Long getVersion() { return version; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getAddress() { return address; }
    public String getCity() { return city; }
    public String getTelephone() { return telephone; }
    public String getAvatarObjectKey() { return avatarObjectKey; }
    public List<Pet> getPets() { return pets; }

    public void setFirstName(String firstName) { this.firstName = firstName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public void setAddress(String address) { this.address = address; }
    public void setCity(String city) { this.city = city; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    public void setAvatarObjectKey(String avatarObjectKey) { this.avatarObjectKey = avatarObjectKey; }

    public void addPet(Pet pet) { this.pets.add(pet); }
    public void removePet(Pet pet) { this.pets.remove(pet); }
}
