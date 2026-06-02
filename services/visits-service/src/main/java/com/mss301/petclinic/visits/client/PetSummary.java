package com.mss301.petclinic.visits.client;

import java.time.LocalDate;

/**
 * Local view của Pet chỉ chứa field visits cần (Tolerant Reader pattern).
 * Customers-service có thể thêm field mới — visits không cần recompile.
 *
 * <p>{@code type} là giống/loài (vd "Poodle"), {@code birthDate} dùng để snapshot
 * + tính tuổi hiển thị trên danh sách ca khám.
 */
public record PetSummary(Long id, String name, String type, LocalDate birthDate, Long ownerId) {
}
