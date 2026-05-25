package com.mss301.petclinic.customers.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Per-instance ownership helper, dùng trong {@code @PreAuthorize}.
 *
 * <p>Bean name {@code ownerSecurity} → SpEL: {@code @ownerSecurity.isOwner(#id, authentication)}.
 *
 * <p>Logic: đọc claim {@code customerId} (Long) từ JWT của user đang gọi,
 * so sánh với ownerId mà request đang access. Khớp → cho phép. Sai → chặn.
 */
@Component("ownerSecurity")
public class OwnerSecurity {

    private static final Logger log = LoggerFactory.getLogger(OwnerSecurity.class);

    public boolean isOwner(Long ownerId, Authentication authentication) {
        if (ownerId == null || authentication == null) {
            return false;
        }
        if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            return false;
        }
        Jwt jwt = jwtAuth.getToken();
        Object raw = jwt.getClaim("customerId");
        if (raw == null) {
            log.debug("isOwner({}): JWT missing customerId claim → deny", ownerId);
            return false;
        }
        if (!(raw instanceof Number n)) {
            log.warn("isOwner({}): JWT customerId claim is not numeric ({}) → deny",
                    ownerId, raw.getClass().getSimpleName());
            return false;
        }
        return n.longValue() == ownerId;
    }
}
