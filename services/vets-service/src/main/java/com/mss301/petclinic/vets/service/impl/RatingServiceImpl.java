package com.mss301.petclinic.vets.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.vets.dto.req.RatingRequest;
import com.mss301.petclinic.vets.dto.res.RatingResponse;
import com.mss301.petclinic.vets.dto.res.RatingSummaryResponse;
import com.mss301.petclinic.vets.dto.res.TopRatedVetResponse;
import com.mss301.petclinic.vets.exception.RatingNotFoundException;
import com.mss301.petclinic.vets.exception.VetNotFoundException;
import com.mss301.petclinic.vets.model.Rating;
import com.mss301.petclinic.vets.repository.RatingRepository;
import com.mss301.petclinic.vets.repository.VetRepository;
import com.mss301.petclinic.vets.service.RatingService;

@Service
@Transactional(readOnly = true)
public class RatingServiceImpl implements RatingService {

    private final RatingRepository ratingRepository;
    private final VetRepository vetRepository;

    public RatingServiceImpl(RatingRepository ratingRepository, VetRepository vetRepository) {
        this.ratingRepository = ratingRepository;
        this.vetRepository = vetRepository;
    }

    @Override
    public Page<RatingResponse> findAllByVetId(Long vetId, Pageable pageable) {
        ensureVetExists(vetId);
        return ratingRepository.findByVetId(vetId, pageable).map(RatingResponse::from);
    }

    @Override
    @Transactional
    public RatingResponse create(Long vetId, RatingRequest request) {
        ensureVetExists(vetId);
        Rating saved = ratingRepository.save(request.toEntity(vetId));
        return RatingResponse.from(saved);
    }

    @Override
    @Transactional
    public void delete(Long vetId, Long ratingId) {
        ensureVetExists(vetId);
        Rating rating = ratingRepository
                .findByIdAndVetId(ratingId, vetId)
                .orElseThrow(() -> new RatingNotFoundException(ratingId.toString()));
        ratingRepository.delete(rating);
    }

    @Override
    public RatingSummaryResponse getSummary(Long vetId) {
        ensureVetExists(vetId);
        long count = ratingRepository.countByVetId(vetId);
        Double average = ratingRepository.findAverageScoreByVetId(vetId);

        // Fill đủ 5 key (1..5) với value mặc định 0 để FE không phải defensive null-check.
        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }
        for (Object[] row : ratingRepository.findScoreDistributionByVetId(vetId)) {
            Integer score = (Integer) row[0];
            Long cnt = (Long) row[1];
            distribution.put(score, cnt);
        }

        return new RatingSummaryResponse(count, average, distribution);
    }

    @Override
    public List<TopRatedVetResponse> getTopRated(int limit) {
        // PageRequest dùng làm LIMIT thuần — query đã có ORDER BY, không cần sort param.
        List<Object[]> rows = ratingRepository.findTopRatedVets(PageRequest.of(0, limit));
        return rows.stream()
                .map(row -> new TopRatedVetResponse(
                        (Long) row[0],
                        (String) row[1],
                        (String) row[2],
                        (Long) row[3],
                        (Double) row[4]
                ))
                .toList();
    }

    private void ensureVetExists(Long vetId) {
        if (!vetRepository.existsById(vetId)) {
            throw new VetNotFoundException(vetId.toString());
        }
    }
}
