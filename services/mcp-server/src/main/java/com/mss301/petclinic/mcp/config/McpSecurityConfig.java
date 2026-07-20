package com.mss301.petclinic.mcp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Deliberately open MCP transport for the local course/demo environment.
 *
 * <p>This service is a tool adapter, not a public business API. Its tools call the narrowly
 * scoped, read-only {@code /internal/ai/**} endpoints of the domain services, so no end-user
 * JWT is accepted, propagated, or required. Do not expose port 8187 publicly in production
 * without restoring an explicit network and authentication boundary.
 */
@Configuration
public class McpSecurityConfig {

    @Bean
    public SecurityFilterChain mcpSecurityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll());
        return http.build();
    }
}
