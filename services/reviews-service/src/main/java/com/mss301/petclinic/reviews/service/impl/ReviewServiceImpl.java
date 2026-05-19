package com.mss301.petclinic.reviews.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.reviews.client.RemoteClientsFacade;
import com.mss301.petclinic.reviews.client.VisitSummary;
import com.mss301.petclinic.reviews.dto.req.CreateReviewRequest;
import com.mss301.petclinic.reviews.dto.req.HideReviewRequest;
import com.mss301.petclinic.reviews.dto.req.UpdateReviewRequest;
import com.mss301.petclinic.reviews.dto.req.VoteRequest;
import com.mss301.petclinic.reviews.dto.res.ReviewResponse;
import com.mss301.petclinic.reviews.dto.res.ReviewSummaryResponse;
import com.mss301.petclinic.reviews.events.ReviewCreatedEvent;
import com.mss301.petclinic.reviews.exception.EditWindowExpiredException;
import com.mss301.petclinic.reviews.exception.EligibilityNotMetException;
import com.mss301.petclinic.reviews.exception.ReviewAlreadyExistsException;
import com.mss301.petclinic.reviews.exception.ReviewNotFoundException;
import com.mss301.petclinic.reviews.exception.SelfVoteForbiddenException;
import com.mss301.petclinic.reviews.model.Review;
import com.mss301.petclinic.reviews.model.ReviewStatus;
import com.mss301.petclinic.reviews.model.ReviewVote;
import com.mss301.petclinic.reviews.model.TargetType;
import com.mss301.petclinic.reviews.model.VoteType;
import com.mss301.petclinic.reviews.repository.ReviewRepository;
import com.mss301.petclinic.reviews.repository.ReviewSpecifications;
import com.mss301.petclinic.reviews.repository.ReviewVoteRepository;
import com.mss301.petclinic.reviews.service.ReviewService;
import com.mss301.petclinic.reviews.service.moderation.ContentModerator;
import com.mss301.petclinic.reviews.service.moderation.ModerationResult;

@Service
@Transactional(readOnly = true)
public class ReviewServiceImpl implements ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewServiceImpl.class);

    /** Edit window 7 ngày từ created_date — config hard-code v1, có thể move sang @ConfigurationProperties v2. */
    private static final Duration EDIT_WINDOW = Duration.ofDays(7);

    private final ReviewRepository repository;
    private final ReviewVoteRepository voteRepository;
    private final ContentModerator moderator;
    private final RemoteClientsFacade remoteClients;
    /** Optional — broker có thể disabled (test profile) hoặc tạm down. */
    private final ObjectProvider<EventPublisher> events;

    public ReviewServiceImpl(ReviewRepository repository,
                              ReviewVoteRepository voteRepository,
                              ContentModerator moderator,
                              RemoteClientsFacade remoteClients,
                              ObjectProvider<EventPublisher> events) {
        this.repository = repository;
        this.voteRepository = voteRepository;
        this.moderator = moderator;
        this.remoteClients = remoteClients;
        this.events = events;
    }

    // ============================ USER ============================

    @Override
    @Transactional
    public ReviewResponse create(CreateReviewRequest req, UUID authorId, String authorName) {
        // 1. UNIQUE pre-check (rõ ràng hơn DataIntegrityViolation từ DB).
        if (repository.existsByAuthorIdAndTargetTypeAndTargetId(authorId, req.targetType(), req.targetId())) {
            throw new ReviewAlreadyExistsException(req.targetType(), req.targetId().toString());
        }

        // 2. Eligibility — VET/VISIT cần visit COMPLETED của author. PRODUCT skip v1.
        checkEligibility(req.targetType(), req.targetId(), authorId);

        // 3. Moderation — hit profanity → status PENDING_MODERATION (không reject).
        ModerationResult mod = moderator.check(req.title(), req.comment());
        ReviewStatus initialStatus = mod.profane() ? ReviewStatus.PENDING_MODERATION : ReviewStatus.PUBLISHED;
        if (mod.profane()) {
            log.info("Review từ author={} flagged moderation, hits={}", authorId, mod.hitWords());
        }

        // 4. Persist.
        Review saved = repository.save(req.toEntity(authorId, authorName, initialStatus));

        // 5. Event publish (best-effort, broker down OK).
        publishCreated(saved);

        return ReviewResponse.from(saved);
    }

    @Override
    public ReviewResponse findById(Long id) {
        return ReviewResponse.from(loadOrThrow(id));
    }

    @Override
    public Page<ReviewResponse> search(TargetType targetType, Long targetId, ReviewStatus status,
                                        UUID authorFilter, Integer minRating, Pageable pageable) {
        return repository.findAll(
                ReviewSpecifications.filter(targetType, targetId, status, authorFilter, minRating),
                pageable
        ).map(ReviewResponse::from);
    }

    @Override
    @Transactional
    public ReviewResponse update(Long id, UpdateReviewRequest req, UUID currentUserId) {
        if (req.isEmpty()) {
            // Không có gì để update — return current state.
            return ReviewResponse.from(loadOrThrow(id));
        }

        // Ownership lookup → 404 nếu không phải của user (path-tamper protection).
        Review r = repository.findByIdAndAuthorId(id, currentUserId)
                .orElseThrow(() -> new ReviewNotFoundException(id.toString()));

        // Edit window check.
        Instant createdDate = r.getCreatedDate();
        if (createdDate != null && Duration.between(createdDate, Instant.now()).compareTo(EDIT_WINDOW) > 0) {
            throw new EditWindowExpiredException(EDIT_WINDOW);
        }

        // Apply patch.
        int newRating  = req.hasRating()  ? req.rating()  : r.getRating();
        String newTitle = req.hasTitle()  ? req.title().trim()  : r.getTitle();
        String newComment = req.hasComment() ? req.comment().trim() : r.getComment();

        // Re-moderate nếu title hoặc comment đổi.
        ReviewStatus newStatus = r.getStatus();
        if (req.hasTitle() || req.hasComment()) {
            ModerationResult mod = moderator.check(newTitle, newComment);
            // Nếu user đang ở PUBLISHED và edit hit profanity → đẩy về PENDING_MODERATION.
            // Nếu đang ở PENDING_MODERATION và edit clean → giữ PENDING (admin tự duyệt).
            if (mod.profane() && r.getStatus() == ReviewStatus.PUBLISHED) {
                newStatus = ReviewStatus.PENDING_MODERATION;
            }
        }

        r.edit(newRating, newTitle, newComment, newStatus);
        return ReviewResponse.from(r);
    }

    @Override
    @Transactional
    public void softDelete(Long id, UUID currentUserId) {
        Review r = repository.findByIdAndAuthorId(id, currentUserId)
                .orElseThrow(() -> new ReviewNotFoundException(id.toString()));
        r.softDelete();
    }

    @Override
    @Transactional
    public ReviewResponse vote(Long id, VoteRequest req, UUID currentUserId) {
        Review r = loadOrThrow(id);

        // Anti-gaming: author không vote chính review.
        if (r.getAuthorId().equals(currentUserId)) {
            throw new SelfVoteForbiddenException();
        }

        // Upsert vote.
        Optional<ReviewVote> existing = voteRepository.findByReviewIdAndUserId(id, currentUserId);
        if (existing.isPresent()) {
            existing.get().changeVote(req.voteType());
        } else {
            voteRepository.save(ReviewVote.of(id, currentUserId, req.voteType()));
        }

        // Recompute denorm helpful_count từ source-of-truth.
        long helpful = voteRepository.countByReviewIdAndVoteType(id, VoteType.HELPFUL);
        r.setHelpfulCount((int) helpful);

        return ReviewResponse.from(r);
    }

    @Override
    public ReviewSummaryResponse summary(TargetType targetType, Long targetId) {
        var rows = repository.aggregateRatingDistribution(targetType, targetId, ReviewStatus.PUBLISHED);

        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }
        long totalCount = 0;
        long weightedSum = 0;
        for (Object[] row : rows) {
            Integer rating = (Integer) row[0];
            Long count = (Long) row[1];
            distribution.put(rating, count);
            totalCount += count;
            weightedSum += (long) rating * count;
        }

        BigDecimal average = totalCount == 0
                ? null
                : BigDecimal.valueOf(weightedSum)
                        .divide(BigDecimal.valueOf(totalCount), 2, RoundingMode.HALF_UP);

        return new ReviewSummaryResponse(targetType, targetId, totalCount, average, distribution);
    }

    // ============================ ADMIN ============================

    @Override
    @Transactional
    public ReviewResponse approve(Long id) {
        Review r = loadOrThrow(id);
        r.approve();
        return ReviewResponse.from(r);
    }

    @Override
    @Transactional
    public ReviewResponse hide(Long id, HideReviewRequest req) {
        Review r = loadOrThrow(id);
        log.info("Review {} hidden by admin, reason: {}", id, req.reason());
        r.hide();
        return ReviewResponse.from(r);
    }

    @Override
    @Transactional
    public ReviewResponse unhide(Long id) {
        Review r = loadOrThrow(id);
        r.approve(); // HIDDEN → PUBLISHED via state machine.
        return ReviewResponse.from(r);
    }

    @Override
    @Transactional
    public void adminDelete(Long id) {
        Review r = loadOrThrow(id);
        r.softDelete();
    }

    // ============================ helpers ============================

    private Review loadOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ReviewNotFoundException(id.toString()));
    }

    /**
     * Eligibility rules:
     * <ul>
     *   <li>VET/VISIT: phải có visit COMPLETED với customerUserId = author</li>
     *   <li>PRODUCT: skip v1 (chưa có billing-service kiểm tra invoice PAID)</li>
     * </ul>
     *
     * <p>Convention business: FE pass visitId làm targetId trong cả 2 case VET và VISIT
     * (review VET phải qua 1 visit cụ thể). PRODUCT skip eligibility v1.
     */
    private void checkEligibility(TargetType type, Long targetId, UUID authorId) {
        if (type == TargetType.PRODUCT) {
            return;
        }

        VisitSummary visit;
        try {
            visit = remoteClients.fetchVisit(targetId);
        } catch (HttpClientErrorException.NotFound e) {
            throw new EligibilityNotMetException(type, "visit " + targetId + " không tồn tại");
        }

        if (!"COMPLETED".equals(visit.status())) {
            throw new EligibilityNotMetException(type, "visit chưa COMPLETED (status=" + visit.status() + ")");
        }
        if (!authorId.equals(visit.customerUserId())) {
            throw new EligibilityNotMetException(type, "visit không thuộc về bạn");
        }
    }

    private void publishCreated(Review saved) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null) {
            return;
        }
        try {
            publisher.publish(ReviewCreatedEvent.of(
                    saved.getId(),
                    saved.getTargetType(),
                    saved.getTargetId(),
                    saved.getAuthorId(),
                    saved.getAuthorName(),
                    saved.getRating(),
                    saved.getTitle(),
                    saved.getStatus()
            ));
        } catch (RuntimeException ex) {
            log.warn("Publish review.created failed (review={}): {}", saved.getId(), ex.getMessage());
        }
    }
}
