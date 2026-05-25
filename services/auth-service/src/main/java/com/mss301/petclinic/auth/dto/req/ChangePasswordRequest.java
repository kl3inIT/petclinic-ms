package com.mss301.petclinic.auth.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Đổi mật khẩu — user nhập currentPassword (verify trước) + newPassword (policy 8-72 ký tự).
 *
 * <p>Server-side validation tối thiểu: NotBlank + length. Policy strength (chữ hoa, số, …)
 * defer cho phase sau nếu cần — hiện FE đã validate ở Zod schema.
 */
public record ChangePasswordRequest(
        @NotBlank
        String currentPassword,

        @NotBlank
        @Size(min = 8, max = 72, message = "Mật khẩu mới 8-72 ký tự")
        String newPassword
) {}
