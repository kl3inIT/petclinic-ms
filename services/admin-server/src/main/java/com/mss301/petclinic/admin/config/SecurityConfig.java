package com.mss301.petclinic.admin.config;

import de.codecentric.boot.admin.server.config.AdminServerProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.authentication.RedirectServerAuthenticationSuccessHandler;
/**
 * Bảo vệ Spring Boot Admin UI (WebFlux stack — SBA 4 reactive) bằng form-login + HTTP Basic.
 *
 * <p>Endpoints public: assets, login, instances (SBA client register), actuator.
 * CSRF disabled — dev/learning project, SBA client POST không có session.
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    private final AdminServerProperties adminServer;

    public SecurityConfig(AdminServerProperties adminServer) {
        this.adminServer = adminServer;
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        var successHandler = new RedirectServerAuthenticationSuccessHandler();
        successHandler.setLocation(java.net.URI.create(adminServer.path("/")));

        return http.authorizeExchange(ex -> ex
                        .pathMatchers(adminServer.path("/assets/**"),
                                       adminServer.path("/login"),
                                       adminServer.path("/variables.css"),
                                       adminServer.path("/instances"),
                                       adminServer.path("/instances/*"),
                                       adminServer.path("/actuator/**"))
                        .permitAll()
                        .anyExchange().authenticated())
                .formLogin(form -> form.loginPage(adminServer.path("/login"))
                        .authenticationSuccessHandler(successHandler))
                .logout(out -> out.logoutUrl(adminServer.path("/logout")))
                .httpBasic(Customizer.withDefaults())
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .build();
    }
}
