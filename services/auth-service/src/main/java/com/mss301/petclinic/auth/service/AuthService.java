package com.mss301.petclinic.auth.service;

import java.util.UUID;

import com.mss301.petclinic.auth.dto.req.LoginRequest;
import com.mss301.petclinic.auth.dto.req.RegisterRequest;
import com.mss301.petclinic.auth.dto.res.AuthResponse;
import com.mss301.petclinic.auth.dto.res.UserResponse;

public interface AuthService {

    UserResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refresh(String refreshToken);

    void logout(UUID userId);

    UserResponse getCurrentUser(UUID userId);

    /**
     * Phase L — admin link user account ↔ customer (owner) entity.
     *
     * <p>Sau khi link, JWT phát hành lần kế tiếp sẽ carry claim {@code customerId}. User cần
     * logout/login (hoặc refresh token) để nhận token mới.
     *
     * @param userId     user trong auth schema
     * @param customerId owner id trong customers schema (KHÔNG verify cross-schema)
     * @return user sau khi update
     * @throws com.mss301.petclinic.common.web.exception.ResourceNotFoundException user không tồn tại
     * @throws com.mss301.petclinic.common.web.exception.BadRequestAlertException customerId đã link user khác (uk_users_customer_id)
     */
    UserResponse linkCustomer(UUID userId, Long customerId);

    /**
     * Phase K — admin link user account ↔ vet entity của vets-service.
     *
     * <p>Sau khi link, JWT phát hành lần kế tiếp sẽ carry claim {@code vetId}.
     * vets-service {@code /api/v1/vets/me/*} dùng claim này để resolve hồ sơ vet.
     *
     * @param userId user trong auth schema
     * @param vetId  vet id trong vets schema (KHÔNG verify cross-schema)
     * @return user sau khi update
     * @throws com.mss301.petclinic.common.web.exception.ResourceNotFoundException user không tồn tại
     */
    UserResponse linkVet(UUID userId, Long vetId);

    /**
     * Đổi mật khẩu cho user đang đăng nhập.
     *
     * <p>Verify currentPassword qua PasswordEncoder.matches; sai → throw
     * {@link com.mss301.petclinic.common.web.exception.BadRequestAlertException}
     * (errorKey {@code invalid-current-password}). Update mật khẩu mới + revoke
     * refresh tokens hiện có (force re-login trên device khác).
     */
    void changePassword(UUID userId, String currentPassword, String newPassword);
}
