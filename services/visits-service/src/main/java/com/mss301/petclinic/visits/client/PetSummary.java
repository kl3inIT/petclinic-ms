package com.mss301.petclinic.visits.client;

/**
 * Local view của Pet chỉ chứa field visits cần (Tolerant Reader pattern).
 * Customers-service có thể thêm field mới — visits không cần recompile.
 */
public record PetSummary(Long id, String name, String type, Long ownerId) {
}
