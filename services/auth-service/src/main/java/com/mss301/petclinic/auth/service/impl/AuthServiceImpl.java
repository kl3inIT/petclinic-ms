package com.mss301.petclinic.auth.service.impl;

import com.mss301.petclinic.auth.dto.req.LoginRequest;
import com.mss301.petclinic.auth.dto.req.RegisterRequest;
import com.mss301.petclinic.auth.dto.res.AuthResponse;
import com.mss301.petclinic.auth.dto.res.UserResponse;
import com.mss301.petclinic.auth.exception.InvalidCredentialsException;
import com.mss301.petclinic.auth.exception.UsernameTakenException;
import com.mss301.petclinic.auth.model.User;
import com.mss301.petclinic.auth.repository.UserRepository;
import com.mss301.petclinic.auth.security.AuthAuditLogger;
import com.mss301.petclinic.auth.security.JwtTokenProvider;
import com.mss301.petclinic.auth.security.RefreshTokenService;
import com.mss301.petclinic.auth.service.AuthService;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final AuthAuditLogger audit;

    public AuthServiceImpl(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           JwtTokenProvider jwtTokenProvider,
                           RefreshTokenService refreshTokenService,
                           AuthAuditLogger audit) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenService = refreshTokenService;
        this.audit = audit;
    }

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new UsernameTakenException(request.username());
        }
        User saved = userRepository.save(request.toEntity(passwordEncoder));
        audit.registerSuccess(saved.getId(), saved.getUsername());
        return UserResponse.from(saved);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username()).orElse(null);
        if (user == null || !user.isEnabled()
                || !passwordEncoder.matches(request.password(), user.getPassword())) {
            audit.loginFailure(request.username(), user == null ? "user_not_found"
                    : !user.isEnabled() ? "user_disabled" : "wrong_password");
            throw new InvalidCredentialsException();
        }
        JwtTokenProvider.IssuedToken access = jwtTokenProvider.issueAccessToken(user);
        RefreshTokenService.IssuedRefresh refresh = refreshTokenService.issue(user.getId());
        audit.loginSuccess(user.getId(), user.getUsername());
        return AuthResponse.of(access.token(), access.expiresInSeconds(),
                refresh.token(), refresh.expiresInSeconds(),
                user.getId(), user.getUsername(), user.getRoles());
    }

    @Override
    @Transactional
    public AuthResponse refresh(String refreshToken) {
        UUID userId;
        try {
            userId = refreshTokenService.consumeAndValidate(refreshToken);
        } catch (RefreshTokenService.InvalidRefreshTokenException ex) {
            audit.refreshFailure("invalid_or_expired_or_revoked");
            throw new BadRequestAlertException(
                    "Invalid or expired refresh token. Please log in again.",
                    "RefreshToken", "invalid-refresh-token");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestAlertException(
                        "User no longer exists", "User", "user-removed"));
        if (!user.isEnabled()) {
            throw new BadRequestAlertException("User account is disabled", "User", "user-disabled");
        }
        JwtTokenProvider.IssuedToken access = jwtTokenProvider.issueAccessToken(user);
        RefreshTokenService.IssuedRefresh newRefresh = refreshTokenService.issue(user.getId());
        audit.refreshSuccess(user.getId());
        return AuthResponse.of(access.token(), access.expiresInSeconds(),
                newRefresh.token(), newRefresh.expiresInSeconds(),
                user.getId(), user.getUsername(), user.getRoles());
    }

    @Override
    @Transactional
    public void logout(UUID userId) {
        refreshTokenService.revokeAllForUser(userId);
        audit.logoutSuccess(userId);
    }

    @Override
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId.toString()));
        return UserResponse.from(user);
    }

    private static class UserNotFoundException extends ResourceNotFoundException {
        private static final long serialVersionUID = 1L;
        UserNotFoundException(String id) { super("User", id); }
    }
}
