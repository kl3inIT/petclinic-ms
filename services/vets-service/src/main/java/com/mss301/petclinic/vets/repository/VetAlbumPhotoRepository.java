package com.mss301.petclinic.vets.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.mss301.petclinic.vets.model.VetAlbumPhoto;

public interface VetAlbumPhotoRepository extends JpaRepository<VetAlbumPhoto, Long> {

    Page<VetAlbumPhoto> findByVetId(Long vetId, Pageable pageable);

    Optional<VetAlbumPhoto> findByIdAndVetId(Long id, Long vetId);

    /** Projection cho orphan cleanup — xem javadoc VetPhotoRepository.findAllObjectKeys. */
    @Query("SELECT p.objectKey FROM VetAlbumPhoto p")
    List<String> findAllObjectKeys();
}
