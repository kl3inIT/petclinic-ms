package com.mss301.petclinic.vets.service;

import java.util.List;

import com.mss301.petclinic.vets.dto.req.WorkScheduleRequest;
import com.mss301.petclinic.vets.dto.res.WorkScheduleSlotResponse;
import com.mss301.petclinic.vets.model.WorkHour;
import com.mss301.petclinic.vets.model.Workday;

public interface WorkScheduleService {

    List<WorkScheduleSlotResponse> findAllByVetId(Long vetId);

    /**
     * REPLACE toàn bộ lịch trực của vet. Empty {@code request.slots()} → clear all.
     * Idempotent — gọi cùng request nhiều lần cho kết quả như nhau.
     */
    List<WorkScheduleSlotResponse> replaceAll(Long vetId, WorkScheduleRequest request);

    void clearAll(Long vetId);

    /**
     * Phase H: check vet có lịch trực tại (workday, workHour) hay không.
     * Visits-service gọi method này trước khi bookVisit để chống double-booking.
     * Vet không tồn tại → throw {@link com.mss301.petclinic.vets.exception.VetNotFoundException}.
     */
    boolean isAvailable(Long vetId, Workday workday, WorkHour workHour);
}
