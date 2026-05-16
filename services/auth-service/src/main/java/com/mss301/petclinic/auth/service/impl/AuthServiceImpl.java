package com.mss301.petclinic.auth.service.impl;

import com.mss301.petclinic.auth.dto.req.LoginRequest;
import com.mss301.petclinic.auth.dto.req.RegisterRequest;
import com.mss301.petclinic.auth.dto.res.AuthResponse;
import com.mss301.petclinic.auth.dto.res.UserResponse;
import com.mss301.petclinic.auth.exception.InvalidCredentialsException;
import com.mss301.petclinic.auth.exception.UsernameTakenException;
import com.mss301.petclinic.auth.model.User;
import com.mss301.petclinic.auth.repository.UserRepository;
import com.mss301.petclinic.auth.security.JwtTokenProvider;
import com.mss301.petclinic.auth.service.AuthService;
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

    public AuthServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new UsernameTakenException(request.username());
        }
        User user = request.toEntity(passwordEncoder);
        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        // Username enumeration protection: cùng exception cho "user không tồn tại" và "wrong password".
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(InvalidCredentialsException::new);

        if (!user.isEnabled()) {
            throw new InvalidCredentialsException();
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new InvalidCredentialsException();
        }

        JwtTokenProvider.IssuedToken issued = jwtTokenProvider.issueAccessToken(user);
        return AuthResponse.bearer(issued.token(), issued.expiresInSeconds(),
                user.getId(), user.getUsername(), user.getRoles());
    }

    @Override
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId.toString()));
        return UserResponse.from(user);
    }

    /** Local subclass — chỉ /me dùng (không expose external). */
    private static class UserNotFoundException extends ResourceNotFoundException {
        UserNotFoundException(String id) { super("User", id); }
    }
}
