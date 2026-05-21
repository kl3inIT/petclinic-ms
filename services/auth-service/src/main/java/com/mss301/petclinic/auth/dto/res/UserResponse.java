package com.mss301.petclinic.auth.dto.res;

import java.util.Set;
import java.util.UUID;

import com.mss301.petclinic.auth.model.User;

/**
 * User response — expose minimal field. Phase K thêm vetId, Phase L thêm customerId
 * để admin xác nhận sau khi link cross-schema. NULL nếu user chưa link entity tương ứng.
 */
public record UserResponse(
        UUID id,
        String username,
        String email,
        Set<String> roles,
        boolean enabled,
        Long vetId,
        Long customerId
) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getUsername(), u.getEmail(), u.getRoles(),
                u.isEnabled(), u.getVetId(), u.getCustomerId());
    }
}
