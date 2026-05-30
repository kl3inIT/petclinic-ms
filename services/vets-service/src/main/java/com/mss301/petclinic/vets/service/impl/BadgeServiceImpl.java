package com.mss301.petclinic.vets.service.impl;

import java.time.LocalDate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.vets.dto.req.BadgeRequest;
import com.mss301.petclinic.vets.dto.res.BadgeResponse;
import com.mss301.petclinic.vets.exception.BadgeNotFoundException;
import com.mss301.petclinic.vets.exception.VetNotFoundException;
import com.mss301.petclinic.vets.model.Badge;
import com.mss301.petclinic.vets.repository.BadgeRepository;
import com.mss301.petclinic.vets.repository.VetRepository;
import com.mss301.petclinic.vets.service.BadgeService;

@Service
@Transactional(readOnly = true)
public class BadgeServiceImpl implements BadgeService {

    private static final String ENTITY_NAME = "badge";

    private final BadgeRepository badgeRepository;
    private final VetRepository vetRepository;

    public BadgeServiceImpl(BadgeRepository badgeRepository, VetRepository vetRepository) {
        this.badgeRepository = badgeRepository;
        this.vetRepository = vetRepository;
    }

    @Override
    public Page<BadgeResponse> findAllByVetId(Long vetId, Pageable pageable) {
        ensureVetExists(vetId);
        return badgeRepository.findByVetId(vetId, pageable).map(BadgeResponse::from);
    }

    @Override
    @Transactional
    public BadgeResponse create(Long vetId, BadgeRequest request) {
        ensureVetExists(vetId);
        if (request.awardedDate().isAfter(LocalDate.now())) {
            // Badge không thể trao trong tương lai. KHÔNG dùng @PastOrPresent ở DTO
            // vì phụ thuộc clock + khó test deterministic. Validate ở service rõ ràng hơn.
            throw new BadRequestAlertException(
                    "awardedDate must not be in the future: " + request.awardedDate(),
                    ENTITY_NAME,
                    "date-future"
            );
        }
        Badge saved = badgeRepository.save(request.toEntity(vetId));
        return BadgeResponse.from(saved);
    }

    @Override
    @Transactional
    public void delete(Long vetId, Long badgeId) {
        ensureVetExists(vetId);
        Badge badge = badgeRepository
                .findByIdAndVetId(badgeId, vetId)
                .orElseThrow(() -> new BadgeNotFoundException(badgeId.toString()));
        badgeRepository.delete(badge);
    }

    private void ensureVetExists(Long vetId) {
        if (!vetRepository.existsById(vetId)) {
            throw new VetNotFoundException(vetId.toString());
        }
    }
}
