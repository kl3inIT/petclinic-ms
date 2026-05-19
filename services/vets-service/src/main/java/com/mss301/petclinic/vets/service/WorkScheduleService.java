package com.mss301.petclinic.vets.service;

import java.util.List;

import com.mss301.petclinic.vets.dto.req.WorkScheduleRequest;
import com.mss301.petclinic.vets.dto.res.WorkScheduleSlotResponse;

public interface WorkScheduleService {

    List<WorkScheduleSlotResponse> findAllByVetId(Long vetId);

    /**
     * REPLACE toàn bộ lịch trực của vet. Empty {@code request.slots()} → clear all.
     * Idempotent — gọi cùng request nhiều lần cho kết quả như nhau.
     */
    List<WorkScheduleSlotResponse> replaceAll(Long vetId, WorkScheduleRequest request);

    void clearAll(Long vetId);
}
