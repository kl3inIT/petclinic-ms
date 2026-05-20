package com.mss301.petclinic.vets.dto.req;

import java.util.Set;

/**
 * PATCH semantics: <em>null = không đổi</em>. KHÔNG dùng {@code @NotBlank} ở field level vì
 * partial update — field bỏ qua trong JSON body sẽ null. Service layer check blank thủ công
 * khi caller có gửi.
 *
 * <ul>
 *   <li>{@code firstName / lastName}: null → giữ nguyên; non-null + blank → service throw 400.</li>
 *   <li>{@code specialtyNames}: null → giữ specialty cũ; non-null (kể cả empty set) → REPLACE toàn bộ.
 *       Empty set = clear all specialties.</li>
 * </ul>
 */
public record UpdateVetRequest(
        String firstName,
        String lastName,
        Set<String> specialtyNames
) {
    public boolean hasFirstName() { return firstName != null; }
    public boolean hasLastName() { return lastName != null; }
    public boolean hasSpecialties() { return specialtyNames != null; }
}
