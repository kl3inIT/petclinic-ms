package com.mss301.petclinic.vets.dto.res;

/**
 * Response cho endpoint check availability của vet ở 1 (workday, workHour).
 *
 * <p>Phase H: visits-service gọi endpoint này trước khi bookVisit để chống
 * double-booking. Trả single field {@code available} để FE/consumer parse nhanh
 * — không expose lý do "không rảnh" (KHÔNG cần thiết, FE chỉ cần disable button).
 */
public record VetAvailabilityResponse(boolean available) {

    public static VetAvailabilityResponse of(boolean available) {
        return new VetAvailabilityResponse(available);
    }
}
