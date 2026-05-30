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

    Optional<Rating> findByVetIdAndCustomerName(Long vetId, String customerName);

    /**
     * Tổng hợp count + avg + distribution trong 1 query (1 round-trip thay vì 3).
     * Mỗi row: score (1..5), count. Service tính total + average từ rows.
     */
    @Query("SELECT r.score, COUNT(r) FROM Rating r WHERE r.vetId = :vetId GROUP BY r.score")
    List<Object[]> findScoreDistributionByVetId(@Param("vetId") Long vetId);

    @Query("SELECT r.vetId, AVG(r.score) FROM Rating r WHERE r.vetId IN :vetIds GROUP BY r.vetId")
    List<Object[]> findAverageRatingByVetIds(@Param("vetIds") List<Long> vetIds);

    /**
     * Top-N vet theo average score (chỉ active vet, có ít nhất 1 rating).
     * Cross-entity aggregate qua JPQL — Rating không có @ManyToOne Vet, dùng JOIN explicit
     * trên scalar vetId. CodeRabbit review (PR #11) suggest explicit JOIN thay cho implicit
     * cross-join `FROM Vet v, Rating r` để rõ ý đồ + tuân JPA standard.
     *
     * <p>Trả {@code Object[]}: vetId, firstName, lastName, ratingCount, averageScore.
     * Service map sang record.</p>
     */
    @Query("""
            SELECT v.id, v.firstName, v.lastName, COUNT(r), AVG(r.score)
            FROM Vet v JOIN Rating r ON r.vetId = v.id
            WHERE v.active = true
            GROUP BY v.id, v.firstName, v.lastName
            ORDER BY AVG(r.score) DESC, COUNT(r) DESC, v.id ASC
            """)
    List<Object[]> findTopRatedVets(Pageable pageable);
}
