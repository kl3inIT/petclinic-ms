package com.mss301.petclinic.visits.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.visits.dto.req.BookVisitRequest;
import com.mss301.petclinic.visits.dto.req.CompleteVisitRequest;
import com.mss301.petclinic.visits.dto.res.SlotAvailabilityResponse;
import com.mss301.petclinic.visits.dto.res.VisitResponse;
import com.mss301.petclinic.visits.model.VisitStatus;

public interface VisitService {

    VisitResponse book(BookVisitRequest request, UUID currentUserId, Long currentCustomerId);

    VisitResponse findById(Long id);

    /**
     * @param customerFilter nếu non-null, chỉ trả visit có {@code customer_user_id = filter}.
     *                       Caller pass {@code jwt.sub} khi role=USER, null khi STAFF/ADMIN/VET.
     */
    Page<VisitResponse> search(UUID customerFilter, Long vetId, Long petId,
                                VisitStatus status, Instant from, Instant to,
                                Pageable pageable);

    VisitResponse start(Long id);

    VisitResponse complete(Long id, CompleteVisitRequest request);

    /**
     * Cancel visit. Ownership rule:
     * <ul>
     *   <li>{@code privileged=true} (STAFF/ADMIN) → cancel bất kỳ visit nào</li>
     *   <li>{@code privileged=false} (USER) → chỉ cancel visit của mình (customerUserId == currentUserId)</li>
     * </ul>
     */
    VisitResponse cancel(Long id, UUID currentUserId, boolean privileged);

    /**
     * Trả về số ca đã book cho từng work-hour của vet vào 1 ngày local time
     * (Asia/Ho_Chi_Minh). FE dùng để hiển thị "Còn X slot" / "Đã đầy" trên
     * booking calendar.
     */
    SlotAvailabilityResponse getAvailability(Long vetId, LocalDate date);
}
