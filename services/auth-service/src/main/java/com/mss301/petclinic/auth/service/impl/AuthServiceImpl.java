package com.mss301.petclinic.auth.service.impl;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.auth.dto.req.AdminUpdateUserRequest;
import com.mss301.petclinic.auth.dto.req.LoginRequest;
import com.mss301.petclinic.auth.dto.req.RegisterRequest;
import com.mss301.petclinic.auth.dto.res.AuthResponse;
import com.mss301.petclinic.auth.dto.res.UserResponse;
import com.mss301.petclinic.auth.events.UserRegisteredEvent;
import com.mss301.petclinic.auth.exception.InvalidCredentialsException;
import com.mss301.petclinic.auth.exception.UsernameTakenException;
import com.mss301.petclinic.auth.model.User;
import com.mss301.petclinic.auth.repository.UserRepository;
import com.mss301.petclinic.auth.security.AuthAuditLogger;
import com.mss301.petclinic.auth.security.JwtTokenProvider;
import com.mss301.petclinic.auth.security.RefreshTokenService;
import com.mss301.petclinic.auth.service.AuthService;
import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

@Service
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private static final Set<String> ALLOWED_ROLES = Set.of("USER", "STAFF", "VET", "ADMIN");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final AuthAuditLogger audit;
    /** ObjectProvider — broker có thể chưa lên, autoconfig disabled khi test → publisher tuỳ chọn. */
    private final ObjectProvider<EventPublisher> events;

    public AuthServiceImpl(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           JwtTokenProvider jwtTokenProvider,
                           RefreshTokenService refreshTokenService,
                           AuthAuditLogger audit,
                           ObjectProvider<EventPublisher> events) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenService = refreshTokenService;
        this.audit = audit;
        this.events = events;
    }

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new UsernameTakenException(request.username());
        }
        User saved = userRepository.save(request.toEntity(passwordEncoder));
        audit.registerSuccess(saved.getId(), saved.getUsername());

        // Publish event — failure không rollback transaction (broker down ≠ user create fail).
        // EventPublisher tự nuốt RuntimeException? Không — RabbitTemplate có thể throw.
        // Wrap try/catch để register vẫn ok khi broker tạm down. Mailer dùng polling sau cũng được.
        EventPublisher publisher = events.getIfAvailable();
        if (publisher != null) {
            try {
                publisher.publish(UserRegisteredEvent.of(saved.getId(), saved.getUsername(), saved.getEmail()));
            } catch (RuntimeException ex) {
                audit.eventPublishFailure("user.registered", saved.getId(), ex.getMessage());
            }
        }

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

    @Override
    public Page<UserResponse> searchUsers(String query, Pageable pageable) {
        String q = query == null ? "" : query.trim();
        Page<User> users = q.isBlank()
                ? userRepository.findAll(pageable)
                : userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q, pageable);
        return users.map(UserResponse::from);
    }

    @Override
    @Transactional
    public UserResponse updateUserAdmin(UUID userId, AdminUpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId.toString()));

        if (request.hasRoles()) {
            user.setRoles(normalizeRoles(request.roles()));
        }
        if (request.hasEnabled()) {
            user.setEnabled(request.enabled());
        }
        if (request.hasVetId()) {
            user.setVetId(request.vetId());
        }
        if (request.hasCustomerId()) {
            user.setCustomerId(request.customerId());
        }

        try {
            User saved = userRepository.saveAndFlush(user);
            audit.userAuthorizationUpdated(currentAdminId(), saved.getId(), saved.getRoles(), saved.isEnabled());
            return UserResponse.from(saved);
        } catch (DataIntegrityViolationException ex) {
            String msg = ex.getMostSpecificCause().getMessage();
            if (msg != null && msg.contains("uk_users_customer_id")) {
                throw new BadRequestAlertException(
                        "Customer " + request.customerId() + " đã được link với user khác.",
                        "User", "customer-already-linked");
            }
            throw ex;
        }
    }

    private static Set<String> normalizeRoles(Set<String> rawRoles) {
        if (rawRoles == null || rawRoles.isEmpty()) {
            throw new BadRequestAlertException("User phải có ít nhất 1 role.", "User", "roles-required");
        }
        Set<String> normalized = new HashSet<>();
        for (String role : rawRoles) {
            if (role == null || role.isBlank()) {
                throw new BadRequestAlertException("Role không hợp lệ.", "User", "role-invalid");
            }
            String value = role.trim().toUpperCase(Locale.ROOT);
            if (value.startsWith("ROLE_")) {
                value = value.substring("ROLE_".length());
            }
            if (!ALLOWED_ROLES.contains(value)) {
                throw new BadRequestAlertException(
                        "Role không được hỗ trợ: " + role, "User", "role-unsupported");
            }
            normalized.add(value);
        }
        return normalized;
    }

    @Override
    @Transactional
    public UserResponse linkCustomer(UUID userId, Long customerId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId.toString()));
        user.setCustomerId(customerId);
        try {
            // saveAndFlush để dịch unique violation NGAY thay vì để bubble lên flush cuối tx
            // (lúc đó stack trace không còn ở method này → hard debug).
            User saved = userRepository.saveAndFlush(user);
            // Audit TRƯỚC khi return — actor lấy từ SecurityContext (admin đang login).
            // null safe: nếu không có SecurityContext (test/internal call) → adminId = null.
            audit.customerLinked(currentAdminId(), saved.getId(), customerId);
            return UserResponse.from(saved);
        } catch (DataIntegrityViolationException ex) {
            String msg = ex.getMostSpecificCause().getMessage();
            if (msg != null && msg.contains("uk_users_customer_id")) {
                throw new BadRequestAlertException(
                        "Customer " + customerId + " đã được link với user khác.",
                        "User", "customer-already-linked");
            }
            throw ex;
        }
    }

    @Override
    @Transactional
    public UserResponse linkVet(UUID userId, Long vetId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId.toString()));
        user.setVetId(vetId);
        User saved = userRepository.saveAndFlush(user);
        audit.vetLinked(currentAdminId(), saved.getId(), vetId);
        return UserResponse.from(saved);
    }

    @Override
    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId.toString()));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            // Audit failure trước khi throw — admin grep được brute-force pattern.
            audit.passwordChangeFailure(userId);
            throw new BadRequestAlertException(
                    "Mật khẩu hiện tại không đúng.",
                    "User", "invalid-current-password");
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestAlertException(
                    "Mật khẩu mới phải khác mật khẩu hiện tại.",
                    "User", "password-unchanged");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        // Force re-login trên các thiết bị khác — refresh token cũ không còn rotate được.
        // Caller (FE) sau đó gọi /logout để clear session hiện tại cũng phải re-login.
        refreshTokenService.revokeAllForUser(userId);
        audit.passwordChangeSuccess(userId);
    }

    /** Lấy UUID của admin đang login từ SecurityContext. Null nếu không có (test/internal). */
    private static UUID currentAdminId() {
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return null;
        }
        try {
            return UUID.fromString(auth.getName());
        } catch (IllegalArgumentException ex) {
            return null; // anonymous principal hoặc non-UUID name
        }
    }

    private static class UserNotFoundException extends ResourceNotFoundException {
        private static final long serialVersionUID = 1L;
        UserNotFoundException(String id) { super("User", id); }
    }
}
