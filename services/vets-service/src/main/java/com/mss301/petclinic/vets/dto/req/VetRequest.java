package com.mss301.petclinic.vets.dto.req;

import java.util.Set;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.mss301.petclinic.vets.model.Vet;

/**
 * Create-vet request body.
 *
 * <ul>
 *   <li>{@code email} bắt buộc + unique (đồng nhất identity-like cho Vet — quyết định Phase A).
 *       Duplicate → service trả 400 với errorKey {@code email-exists}.</li>
 *   <li>{@code phoneNumber / resume} optional.</li>
 *   <li>Vet được tạo mặc định {@code active=true}. Soft-deactivate bằng PATCH {active:false}.</li>
 * </ul>
 */
public record VetRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        @Size(max = 30) String phoneNumber,
        String resume,
        Set<String> specialtyNames    // Tham chiếu specialty bằng tên — service tìm hoặc throw nếu không tồn tại
) {
    public Vet toEntity() {
        Vet vet = new Vet(firstName, lastName, email);
        vet.setPhoneNumber(phoneNumber);
        vet.setResume(resume);
        // active mặc định true ở entity — KHÔNG cho client tạo vet với active=false
        return vet;
    }
}
