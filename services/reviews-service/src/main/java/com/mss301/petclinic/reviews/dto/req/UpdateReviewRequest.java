package com.mss301.petclinic.reviews.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * Request body cho PATCH /api/v1/reviews/{id}. Field NULL = không đổi (partial update).
 *
 * <p>Boxed wrapper (Integer thay int) để phân biệt "không gửi" vs "gửi giá trị 0".
 *
 * <p>{@code blank string} cho title/comment KHÔNG được xem là valid edit — validate ở
 * service sau khi pre-process. {@code @Size} chỉ bound, không enforce notBlank vì null OK.
 */
public record UpdateReviewRequest(
        @Min(1) @Max(5) Integer rating,
        @Size(max = 120) String title,
        @Size(max = 2000) String comment
) {

    public boolean hasRating() { return rating != null; }
    public boolean hasTitle() { return title != null; }
    public boolean hasComment() { return comment != null; }
    public boolean isEmpty() { return !hasRating() && !hasTitle() && !hasComment(); }
}
