package com.mss301.petclinic.auth.controller;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.auth.dto.req.LinkCustomerRequest;
import com.mss301.petclinic.auth.dto.res.UserResponse;
import com.mss301.petclinic.auth.service.AuthService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Service-to-service lookup endpoint — visits-service / billing-service / mailer enrich
 * event payload bằng email + username từ user id (UUID).
 *
 * <p>Authenticated only (any logged-in caller hoặc forwarded JWT từ service khác).
 * KHÔNG check role — kịch bản hợp lệ là vet/staff lookup customer khi tạo lịch.
 * Caller cần hạn chế thêm thì làm tại service layer của họ.
 *
 * <p>Phase L — thêm endpoint admin link customer (PATCH /{id}/customer-link). RBAC ADMIN-only
 * khai báo ở {@code config-repo/auth-service.yml}.
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
    public UserResponse getUser(@PathVariable UUID id) {
        return authService.getCurrentUser(id);
    }

    @PatchMapping("/{id}/customer-link")
    @Operation(
            summary = "Phase L — admin link user account ↔ customer (owner) entity",
            description = "ADMIN only. Sau khi link, user cần logout/login để token mới carry " +
                          "claim customerId. KHÔNG verify customerId tồn tại cross-schema — " +
                          "customers-service tự enforce qua event consume."
    )
    public UserResponse linkCustomer(
            @PathVariable UUID id,
            @RequestBody @Valid LinkCustomerRequest request
    ) {
        return authService.linkCustomer(id, request.customerId());
    }
}
