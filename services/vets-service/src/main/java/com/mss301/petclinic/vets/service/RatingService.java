package com.mss301.petclinic.vets.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.vets.dto.req.RatingRequest;
import com.mss301.petclinic.vets.dto.res.RatingResponse;
import com.mss301.petclinic.vets.dto.res.RatingSummaryResponse;
import com.mss301.petclinic.vets.dto.res.TopRatedVetResponse;

public interface RatingService {

    Page<RatingResponse> findAllByVetId(Long vetId, Pageable pageable);

    RatingResponse create(Long vetId, RatingRequest request, String customerName);

    void delete(Long vetId, Long ratingId);

    RatingSummaryResponse getSummary(Long vetId);

    List<TopRatedVetResponse> getTopRated(int limit);
}
