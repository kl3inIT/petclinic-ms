package com.mss301.petclinic.customers.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.mss301.petclinic.customers.model.Pet;

public interface PetRepository extends JpaRepository<Pet, Long>, JpaSpecificationExecutor<Pet> {

    /** Đếm pet đang dùng catalog row — chặn xoá PetType khi còn FK reference. */
    long countByPetTypeId(Long petTypeId);
}
