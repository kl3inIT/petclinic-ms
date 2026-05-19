package com.mss301.petclinic.vets.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.vets.dto.req.BadgeRequest;
import com.mss301.petclinic.vets.dto.res.BadgeResponse;

public interface BadgeService {

    Page<BadgeResponse> findAllByVetId(Long vetId, Pageable pageable);

    BadgeResponse create(Long vetId, BadgeRequest request);

    void delete(Long vetId, Long badgeId);
}
