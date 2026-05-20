package com.mss301.petclinic.workflow.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Workflow security — JWT cho REST API nghiệp vụ và BPMN designer endpoints.
 */
@Configuration
public class WorkflowSecurityConfig {

    @Bean
    public SecurityFilterChain workflowSecurityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter
    ) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        // Start process instance — cho phép mọi user đã xác thực.
                        // visits-service gọi endpoint này khi booking (forward JWT của booking user).
                        // Authorization "ai được book" đã kiểm soát ở visits-service.
                        .requestMatchers(HttpMethod.POST, "/api/v1/workflows/instances").authenticated()
                        // Các write operations khác (terminate, complete task) — chỉ staff trở lên.
                        .requestMatchers(HttpMethod.POST, "/api/v1/workflows/**").hasAnyRole("ADMIN", "STAFF", "VET")
                        .requestMatchers("/api/v1/workflows/**").authenticated()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}
