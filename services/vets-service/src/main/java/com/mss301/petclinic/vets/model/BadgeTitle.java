package com.mss301.petclinic.vets.model;

import com.mss301.petclinic.common.jpa.enums.IdentifiedEnum;

/**
 * Title của badge — danh sách closed (managed by code, không phải lookup table) vì
 * achievement type ổn định, ít thay đổi. Add value mới: thêm constant, deploy.
 *
 * <p>{@link #id()} = {@link #name()} → DB lưu trực tiếp tên enum qua
 * {@code @Enumerated(STRING)}. Khi rename Java constant trong tương lai (vd PHD_HOLDER →
 * DOCTORATE), override {@code id()} để giữ value cũ ở DB.</p>
 */
public enum BadgeTitle implements IdentifiedEnum {
    ROOKIE,             // Vet mới tham gia
    EXPERIENCED,        // 5+ năm kinh nghiệm
    MASTER,             // 10+ năm
    SURGERY_EXPERT,     // Chuyên gia phẫu thuật
    RESEARCH_AWARD,     // Giải nghiên cứu
    TOP_RATED;          // Đứng top rating thời điểm trao

    @Override
    public String id() {
        return name();
    }
}
