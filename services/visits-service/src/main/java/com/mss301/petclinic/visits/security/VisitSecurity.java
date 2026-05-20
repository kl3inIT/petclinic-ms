package com.mss301.petclinic.visits.security;

import java.util.Set;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.repository.VisitRepository;

/**
 * Per-instance authorization — Least Privilege pattern, fine-grained layer.
 *
 * <h4>Tại sao cần?</h4>
 * URL-based authorization (declarative trong YAML) chỉ kiểm tra "role nào access path nào".
 * KHÔNG biểu đạt được logic "USER chỉ xem visit của chính mình". Đó là per-instance —
 * cần load entity, so sánh {@code visit.customerUserId} với {@code authentication.subject}.
 *
 * <h4>Usage</h4>
 * Spring Security `@PreAuthorize` SpEL gọi bean theo tên:
 * <pre>{@code
 * @PreAuthorize("@visitSecurity.canView(#id, authentication)")
 * @GetMapping("/{id}")
 * public VisitResponse getVisit(@PathVariable Long id) { ... }
 * }</pre>
 *
 * <h4>Privileged roles bypass</h4>
 * STAFF / ADMIN / VET không bị ownership check — họ xem được mọi visit. Logic này
 * THE SAME LOCATION với role-mapping ở SecurityConfig → consistent.
 *
 * <h4>Lý do bean tách riêng, không đặt logic vào Controller</h4>
 * <ul>
 *   <li>Reusable: @PreAuthorize ở mọi method (view, cancel, update...) dùng cùng bean</li>
 *   <li>Unit-testable: mock VisitRepository, assert authorization decision tách rời HTTP</li>
 *   <li>SpEL clean: controller annotation 1 dòng thay vì block code if/else</li>
 * </ul>
 */
@Component("visitSecurity")
public class VisitSecurity {

    /** Roles bypass ownership check — privileged user xem được mọi visit. */
    private static final Set<String> PRIVILEGED_ROLES =
            Set.of("ROLE_STAFF", "ROLE_ADMIN", "ROLE_VET");

    private final VisitRepository visitRepo;

    public VisitSecurity(VisitRepository visitRepo) {
        this.visitRepo = visitRepo;
    }

    /**
     * @return true nếu authenticated user xem được visit (privileged role hoặc owner)
     */
    public boolean canView(Long visitId, Authentication authentication) {
        if (visitId == null || authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        if (hasPrivilegedRole(authentication)) {
            return true;
        }
        return isOwnerOf(visitId, authentication);
    }

    /**
     * Cancel rule giống view — owner self-cancel hoặc privileged role cancel cho người khác.
     * Tách method riêng để dễ extend (vd. tương lai chỉ cho cancel khi status = SCHEDULED).
     */
    public boolean canCancel(Long visitId, Authentication authentication) {
        return canView(visitId, authentication);
    }

    private static boolean hasPrivilegedRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(PRIVILEGED_ROLES::contains);
    }

    private boolean isOwnerOf(Long visitId, Authentication auth) {
        UUID currentUserId = extractUserId(auth);
        if (currentUserId == null) {
            return false;
        }
        return visitRepo
                .findById(visitId)
                .map(Visit::getCustomerUserId)
                .map(currentUserId::equals)
                .orElse(false); // visit không tồn tại → controller sẽ throw NotFound sau
    }

    private static UUID extractUserId(Authentication auth) {
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            return null;
        }
        Jwt jwt = jwtAuth.getToken();
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException e) {
            return null;
        }
    }
}
