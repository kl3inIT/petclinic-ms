package com.mss301.petclinic.auth.controller;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.auth.dto.req.AdminUpdateUserRequest;
import com.mss301.petclinic.auth.dto.res.UserResponse;
import com.mss301.petclinic.auth.service.AuthService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Admin user and role management. RBAC is declared in config-repo/auth-service.yml.
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@Tag(name = "Admin Users", description = "Admin user account, role, and enablement management")
public class AdminUsersController {

    private final AuthService authService;

    public AdminUsersController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    @Operation(summary = "List/search users — ADMIN only")
    public Page<UserResponse> listUsers(@RequestParam(required = false) String q, Pageable pageable) {
        return authService.searchUsers(q, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one user — ADMIN only")
    public UserResponse getAdminUser(@PathVariable UUID id) {
        return authService.getCurrentUser(id);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Patch user roles, enabled flag, and domain links — ADMIN only")
    public UserResponse updateUser(@PathVariable UUID id,
                                   @Valid @RequestBody AdminUpdateUserRequest request) {
        return authService.updateUserAdmin(id, request);
    }
}
