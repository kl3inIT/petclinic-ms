package com.mss301.petclinic.vets.model;

import com.mss301.petclinic.common.jpa.enums.OrderedEnum;

/**
 * Slot 1 giờ làm việc trong ngày (8h-20h). {@link #weight()} = giờ bắt đầu → sortable
 * trực tiếp theo giờ trong ngày. {@link #timeRange()} là display string cho FE/log
 * (KHÔNG dùng cho persistence — DB lưu {@link #name()} qua {@code @Enumerated(STRING)}).
 *
 * <p>Convention: dùng bước nhảy 1 ở đây (8, 9, 10, ...) thay vì 10 vì WorkHour là partition
 * cố định trong ngày 24h — không có "OVERDUE" như status enum cần chèn về sau. Nếu một ngày
 * mở rộng (vd thêm slot 7-8h), thêm enum HOUR_7_8 với weight(7) — KHÔNG đụng giá trị đã persist.</p>
 */
public enum WorkHour implements OrderedEnum {
    HOUR_8_9("8:00-9:00", 8),
    HOUR_9_10("9:00-10:00", 9),
    HOUR_10_11("10:00-11:00", 10),
    HOUR_11_12("11:00-12:00", 11),
    HOUR_12_13("12:00-13:00", 12),
    HOUR_13_14("13:00-14:00", 13),
    HOUR_14_15("14:00-15:00", 14),
    HOUR_15_16("15:00-16:00", 15),
    HOUR_16_17("16:00-17:00", 16),
    HOUR_17_18("17:00-18:00", 17),
    HOUR_18_19("18:00-19:00", 18),
    HOUR_19_20("19:00-20:00", 19);

    private final String timeRange;
    private final int weight;

    WorkHour(String timeRange, int weight) {
        this.timeRange = timeRange;
        this.weight = weight;
    }

    public String timeRange() {
        return timeRange;
    }

    @Override
    public String id() {
        return name();
    }

    @Override
    public int weight() {
        return weight;
    }
}
