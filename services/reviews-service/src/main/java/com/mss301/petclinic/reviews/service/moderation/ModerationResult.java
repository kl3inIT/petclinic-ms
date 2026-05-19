package com.mss301.petclinic.reviews.service.moderation;

import java.util.List;

/**
 * Output của {@link ContentModerator#check(String, String)}.
 *
 * @param profane  true nếu nội dung có vấn đề → service chuyển status sang PENDING_MODERATION
 * @param hitWords list từ ngữ cụ thể bắt được (cho audit log, không hiển thị user)
 */
public record ModerationResult(boolean profane, List<String> hitWords) {

    public static ModerationResult clean() {
        return new ModerationResult(false, List.of());
    }

    public static ModerationResult flagged(List<String> hits) {
        return new ModerationResult(true, List.copyOf(hits));
    }
}
