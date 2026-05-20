package com.mss301.petclinic.vets.dto.req;

import java.time.LocalDate;

/**
 * PATCH semantics: <em>null = không đổi</em>. Theo cùng pattern UpdateVetRequest.
 *
 * <ul>
 *   <li>{@code schoolName / degree}: null → giữ; non-null + blank → 400 error.field-blank.</li>
 *   <li>{@code fieldOfStudy}: null → giữ; non-null + blank → clear (set null trong DB).</li>
 *   <li>{@code startDate}: null → giữ; non-null → set.</li>
 *   <li>{@code endDate}: null → giữ. <strong>Để clear endDate</strong>, FE phải gọi DELETE
 *       hoặc dùng sentinel — record không phân biệt được "không gửi" vs "gửi null".
 *       Đây là limitation của JSON merge-patch khi field nullable; chấp nhận trade-off
 *       cho đơn giản. Nếu sau này cần, đổi sang JSON Patch (RFC 6902).</li>
 * </ul>
 */
public record UpdateEducationRequest(
        String schoolName,
        String degree,
        String fieldOfStudy,
        LocalDate startDate,
        LocalDate endDate
) {
    public boolean hasSchoolName()   { return schoolName   != null; }
    public boolean hasDegree()       { return degree       != null; }
    public boolean hasFieldOfStudy() { return fieldOfStudy != null; }
    public boolean hasStartDate()    { return startDate    != null; }
    public boolean hasEndDate()      { return endDate      != null; }
}
