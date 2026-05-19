package com.mss301.petclinic.vets.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mss301.petclinic.vets.model.Rating;

public interface RatingRepository extends JpaRepository<Rating, Long> {

    Page<Rating> findByVetId(Long vetId, Pageable pageable);

    Optional<Rating> findByIdAndVetId(Long id, Long vetId);

    long countByVetId(Long vetId);

    /**
     * Average score của 1 vet. {@code Double} (boxed) để phân biệt "0 rating" (null)
     * và "average = 0.0" (impossible vì CHECK score >= 1).
     */
    @Query("SELECT AVG(r.score) FROM Rating r WHERE r.vetId = :vetId")
    Double findAverageScoreByVetId(@Param("vetId") Long vetId);

    /**
     * Distribution score (count theo từng giá trị 1-5). Trả 2 cột: score, count.
     * Service map ra Map<Integer, Long> + fill 0 cho score thiếu.
     */
    @Query("SELECT r.score, COUNT(r) FROM Rating r WHERE r.vetId = :vetId GROUP BY r.score")
    List<Object[]> findScoreDistributionByVetId(@Param("vetId") Long vetId);

    /**
     * Top-N vet theo average score (chỉ active vet, có ít nhất 1 rating).
     * Cross-entity aggregate qua JPQL — Rating không có @ManyToOne Vet, dùng implicit join
     * trên scalar vetId. SQL Postgres tự sinh JOIN.
     *
     * <p>Trả {@code Object[]}: vetId, firstName, lastName, ratingCount, averageScore.
     * Service map sang record.</p>
     */
    @Query("""
            SELECT v.id, v.firstName, v.lastName, COUNT(r), AVG(r.score)
            FROM Vet v, Rating r
            WHERE r.vetId = v.id AND v.active = true
            GROUP BY v.id, v.firstName, v.lastName
            ORDER BY AVG(r.score) DESC, COUNT(r) DESC
            """)
    List<Object[]> findTopRatedVets(Pageable pageable);
}
