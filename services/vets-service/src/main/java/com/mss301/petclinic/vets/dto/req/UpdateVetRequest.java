package com.mss301.petclinic.vets.dto.req;

import java.util.Set;

/**
 * PATCH semantics: <em>null = không đổi</em>. KHÔNG dùng {@code @NotBlank} ở field level vì
 * partial update — field bỏ qua trong JSON body sẽ null. Service layer check blank thủ công
 * khi caller có gửi.
 *
 * <ul>
 *   <li>{@code firstName / lastName / email}: null → giữ nguyên; non-null + blank → service throw 400.</li>
 *   <li>{@code email}: non-null + duplicate → service throw 400 (errorKey {@code email-exists}).</li>
 *   <li>{@code phoneNumber / resume}: null → giữ nguyên; non-null (kể cả empty) → REPLACE (cho phép clear bằng "").</li>
 *   <li>{@code active}: null → giữ nguyên; non-null → set. Dùng {@code Boolean} (boxed) chứ KHÔNG {@code boolean}
 *       vì primitive không phân biệt được "không gửi" vs "false".</li>
 *   <li>{@code specialtyNames}: null → giữ specialty cũ; non-null (kể cả empty set) → REPLACE toàn bộ.
 *       Empty set = clear all specialties.</li>
 * </ul>
 */
public record UpdateVetRequest(
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        Boolean active,
        String resume,
        Set<String> specialtyNames
) {
    public boolean hasFirstName()   { return firstName   != null; }
    public boolean hasLastName()    { return lastName    != null; }
    public boolean hasEmail()       { return email       != null; }
    public boolean hasPhoneNumber() { return phoneNumber != null; }
    public boolean hasActive()      { return active      != null; }
    public boolean hasResume()      { return resume      != null; }
    public boolean hasSpecialties() { return specialtyNames != null; }
}
