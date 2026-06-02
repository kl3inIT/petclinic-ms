package com.mss301.petclinic.vets.model;

import com.mss301.petclinic.common.jpa.enums.IdentifiedEnum;

/**
 * Nhãn đánh giá nhanh (canned description) cho rating — port từ Champlain vet-service.
 * Customer có thể chọn 1 nhãn thay vì gõ mô tả tự do. Nếu chọn nhãn mà KHÔNG nhập
 * {@code description}, service tự điền {@code description = label()} (xem RatingServiceImpl).
 *
 * <p>{@link #id()} = {@link #name()} → DB lưu trực tiếp tên enum qua {@code @Enumerated(STRING)}.</p>
 */
public enum PredefinedDescription implements IdentifiedEnum {
    POOR("Kém"),
    AVERAGE("Trung bình"),
    GOOD("Tốt"),
    EXCELLENT("Xuất sắc");

    private final String label;

    PredefinedDescription(String label) {
        this.label = label;
    }

    /** Nhãn hiển thị tiếng Việt — dùng làm description mặc định khi customer không nhập text. */
    public String label() {
        return label;
    }

    @Override
    public String id() {
        return name();
    }
}
