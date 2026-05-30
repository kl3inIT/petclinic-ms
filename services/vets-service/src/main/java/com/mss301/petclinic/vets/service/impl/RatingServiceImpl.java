package com.mss301.petclinic.vets.service.impl;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.vets.dto.req.RatingRequest;
import com.mss301.petclinic.vets.dto.res.RatingResponse;
import com.mss301.petclinic.vets.dto.res.RatingSummaryResponse;
import com.mss301.petclinic.vets.dto.res.TopRatedVetResponse;
import com.mss301.petclinic.vets.events.VetRatingAddedEvent;
import com.mss301.petclinic.vets.exception.RatingNotFoundException;
import com.mss301.petclinic.vets.exception.VetNotFoundException;
import com.mss301.petclinic.vets.model.Rating;
import com.mss301.petclinic.vets.repository.RatingRepository;
import com.mss301.petclinic.vets.repository.VetRepository;
import com.mss301.petclinic.vets.service.RatingService;

@Service
@Transactional(readOnly = true)
public class RatingServiceImpl implements RatingService {

    private static final Logger log = LoggerFactory.getLogger(RatingServiceImpl.class);

    private final RatingRepository ratingRepository;
    private final VetRepository vetRepository;
    private final ObjectProvider<EventPublisher> events;

    public RatingServiceImpl(RatingRepository ratingRepository, VetRepository vetRepository,
                             ObjectProvider<EventPublisher> events) {
        this.ratingRepository = ratingRepository;
        this.vetRepository = vetRepository;
        this.events = events;
    }

    @Override
    public Page<RatingResponse> findAllByVetId(Long vetId, Pageable pageable) {
        ensureVetExists(vetId);
        return ratingRepository.findByVetId(vetId, pageable).map(RatingResponse::from);
    }

    @Override
    @Transactional
    public RatingResponse create(Long vetId, RatingRequest request, String customerName) {
        ensureVetExists(vetId);
        // UPSERT: 1 customer chỉ có 1 rating per vet. POST trùng → update rating cũ.
        // Unique constraint uk_ratings_vet_customer ở DB (changelog 010) là defense-in-depth.
        var existing = ratingRepository.findByVetIdAndCustomerName(vetId, customerName);
        boolean isUpdate = existing.isPresent();
        Rating entity = existing
                .map(e -> {
                    e.setScore(request.score());
                    e.setDescription(request.description());
                    e.setRateDate(OffsetDateTime.now());
                    return e;
                })
                .orElseGet(() -> request.toEntity(vetId, customerName));
        Rating saved = ratingRepository.save(entity);
        publishRatingAddedAfterCommit(saved, isUpdate);
        return RatingResponse.from(saved);
    }

    /**
     * Publish event SAU khi transaction commit thành công (afterCommit hook). Tránh
     * orphan event: nếu DB transaction rollback (CHECK constraint, unique violation,
     * concurrent update fail), event không được fire. Best-effort — broker down chỉ log
     * warning, KHÔNG rollback rating đã saved (rating-add KHÔNG cần guarantee event).
     */
    private void publishRatingAddedAfterCommit(Rating saved, boolean isUpdate) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null) {
            return; // common-events tắt (test profile) → skip
        }

        // M3 fix: guard isSynchronizationActive(). Trước đây gọi registerSynchronization
        // trực tiếp → IllegalStateException khi caller không trong @Transactional context
        // (vd refactor xoá @Transactional ở create, hoặc gọi từ async task). Fallback
        // publish ngay trong trường hợp đó — chấp nhận risk orphan event (rollback sau khi
        // publish) đổi lấy KHÔNG bị NPE runtime.
        VetRatingAddedEvent event = VetRatingAddedEvent.of(
                saved.getId(),
                saved.getVetId(),
                saved.getScore(),
                saved.getDescription(),
                saved.getCustomerName(),
                saved.getRateDate(),
                isUpdate);

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            log.warn("Publish vet.rating.added OUTSIDE transaction (rating={}). "
                    + "Risk orphan event if caller rolls back. Check @Transactional on caller.",
                    saved.getId());
            tryPublish(publisher, event, saved.getId());
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                tryPublish(publisher, event, saved.getId());
            }
        });
    }

    private static void tryPublish(EventPublisher publisher, VetRatingAddedEvent event, Long ratingId) {
        try {
            publisher.publish(event);
        } catch (RuntimeException ex) {
            log.warn("Publish vet.rating.added failed (rating={}): {}", ratingId, ex.getMessage());
        }
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

        // 1 query GROUP BY score → derive count + average tại app layer (1 round-trip thay vì 3).
        // Fill đủ 5 key (1..5) với value mặc định 0 để FE không phải defensive null-check.
        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }
        long count = 0;
        long weightedSum = 0;
        for (Object[] row : ratingRepository.findScoreDistributionByVetId(vetId)) {
            Integer score = (Integer) row[0];
            Long cnt = (Long) row[1];
            distribution.put(score, cnt);
            count += cnt;
            weightedSum += (long) score * cnt;
        }
        Double average = (count == 0) ? null : (double) weightedSum / count;

        return new RatingSummaryResponse(count, average, distribution);
    }

    @Override
    public List<TopRatedVetResponse> getTopRated(int limit) {
        // Validate ở service (KHÔNG dùng @Validated trên @RequestParam — pattern lý do ở
        // TopRatedVetsController javadoc). 1-50: lower bound tránh 0/âm, upper bound
        // tránh query toàn DB nếu FE gửi limit lớn.
        if (limit < 1 || limit > 50) {
            throw new BadRequestAlertException(
                    "limit must be between 1 and 50, got " + limit, "rating", "limit-invalid");
        }
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
