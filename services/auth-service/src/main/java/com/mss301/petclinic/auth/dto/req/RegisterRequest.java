package com.mss301.petclinic.auth.dto.req;

import com.mss301.petclinic.auth.model.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Set;

public record RegisterRequest(
        @NotBlank @Size(min = 3, max = 100) String username,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Size(min = 8, max = 100) String password
) {
    /**
     * Convert sang Entity với password đã BCrypt encoded. Roles mặc định {@code USER}.
     */
    public User toEntity(PasswordEncoder passwordEncoder) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(password));
        Set<String> defaultRoles = new HashSet<>();
        defaultRoles.add("USER");
        u.setRoles(defaultRoles);
        u.setEnabled(true);
        return u;
    }
}
