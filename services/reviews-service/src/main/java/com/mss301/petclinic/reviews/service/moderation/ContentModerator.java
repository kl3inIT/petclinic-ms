package com.mss301.petclinic.reviews.service.moderation;

/**
 * SPI cho moderation. V1 dùng {@link RegexProfanityModerator} (sync, in-process).
 * Swap được sang OpenAI Moderation API hoặc Perspective API ở v2 — chỉ cần đổi
 * implementation `@Service`, không đụng caller.
 */
public interface ContentModerator {

    /**
     * Kiểm tra title + comment có vi phạm không. Sync — block request đến khi xong.
     *
     * @param title   review title (≤120 chars)
     * @param comment review comment (≤2000 chars)
     * @return result với cờ profane + danh sách từ bắt được
     */
    ModerationResult check(String title, String comment);
}
