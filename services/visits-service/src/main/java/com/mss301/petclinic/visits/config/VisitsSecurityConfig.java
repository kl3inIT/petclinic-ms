package com.mss301.petclinic.visits.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import com.mss301.petclinic.common.security.endpoints.EndpointSecurityCustomizer;
import com.mss301.petclinic.common.security.endpoints.SecurityEndpointsProperties;

/**
 * Visits-service security — hybrid Least Privilege:
 *
 * <ol>
 *   <li><b>URL-based coarse-grained (declarative YAML)</b> — role rules ở
 *       {@code config-repo/visits-service.yml} dưới {@code petclinic.security.endpoints.*}</li>
 *   <li><b>Method-level fine-grained ({@code @PreAuthorize})</b> — per-instance ownership
 *       check qua bean {@link com.mss301.petclinic.visits.security.VisitSecurity}. Vd:
 *       {@code @PreAuthorize("@visitSecurity.canView(#id, authentication)")}</li>
 * </ol>
 *
 * <p>{@link EnableMethodSecurity} bật {@code @PreAuthorize}/{@code @PostAuthorize} annotation
 * support. {@code prePostEnabled=true} là default Spring Security 6+ nhưng khai báo explicit
 * cho dễ đọc.
 */
@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class VisitsSecurityConfig {

    @Bean
    public SecurityFilterChain visitsSecurityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter,
            SecurityEndpointsProperties endpoints)
            throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(
                                    "/actuator/health/**",
                                    "/actuator/info",
                                    "/v3/api-docs/**",
                                    "/swagger-ui/**",
                                    "/swagger-ui.html")
                            .permitAll();
                    EndpointSecurityCustomizer.apply(auth, endpoints);
                    auth.anyRequest().authenticated();
                })
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}
