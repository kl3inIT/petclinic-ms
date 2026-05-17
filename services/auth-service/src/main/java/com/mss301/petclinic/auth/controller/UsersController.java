package com.mss301.petclinic.auth.controller;

import com.mss301.petclinic.auth.dto.res.UserResponse;
import com.mss301.petclinic.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Service-to-service lookup endpoint — visits-service / billing-service / mailer enrich
 * event payload bằng email + username từ user id (UUID).
 *
 * <p>Authenticated only (any logged-in caller hoặc forwarded JWT từ service khác).
 * KHÔNG check role — kịch bản hợp lệ là vet/staff lookup customer khi tạo lịch.
 * Caller cần hạn chế thêm thì làm tại service layer của họ.
 */
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "Internal user lookup for service-to-service calls")
public class UsersController {

    private final AuthService authService;

    public UsersController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/{id}")
    @Operation(summary = "Look up user by id — for cross-service event enrichment")
    public UserResponse get(@PathVariable UUID id) {
        return authService.getCurrentUser(id);
    }
}
