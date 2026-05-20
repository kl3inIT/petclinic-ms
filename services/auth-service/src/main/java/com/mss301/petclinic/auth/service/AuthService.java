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
}
