package com.mss301.petclinic.visits.client;

/**
 * Local view của Owner chỉ chứa field visits cần (Tolerant Reader) — dùng để snapshot
 * tên + số điện thoại chủ nuôi lúc đặt lịch.
 */
public record OwnerSummary(Long id, String firstName, String lastName, String telephone) {

    /** Họ tên đầy đủ, trim khoảng trắng thừa khi thiếu một phần. */
    public String fullName() {
        return ((firstName == null ? "" : firstName) + " " + (lastName == null ? "" : lastName)).trim();
    }
}
