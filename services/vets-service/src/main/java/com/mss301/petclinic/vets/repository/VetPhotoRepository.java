package com.mss301.petclinic.vets.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.vets.model.VetPhoto;

public interface VetPhotoRepository extends JpaRepository<VetPhoto, Long> {
    // Sử dụng findById(vetId) trực tiếp vì vetId == PK
}
