package com.mss301.petclinic.admin.config;

import de.codecentric.boot.admin.server.config.AdminServerProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

/**
 * Bảo vệ Spring Boot Admin UI bằng form-login (user) + HTTP Basic (client polling).
 *
 * <p>Endpoints public:
 * <ul>
 *   <li>{@code /assets/**}, {@code /login} — UI static resources + login page</li>
 *   <li>{@code /instances*} — SBA client self-register endpoint (mailer Go POST tới đây)</li>
 *   <li>{@code /actuator/**} — admin-server tự monitor mình</li>
 * </ul>
 *
 * <p>CSRF tắt cho {@code /instances*} và {@code /actuator/**} — client POST không có session.
 * Cookie-based CSRF token vẫn áp dụng cho form login.
 */
@Configuration
public class SecurityConfig {

    private final AdminServerProperties adminServer;

    public SecurityConfig(AdminServerProperties adminServer) {
        this.adminServer = adminServer;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        var successHandler = new SavedRequestAwareAuthenticationSuccessHandler();
        successHandler.setTargetUrlParameter("redirectTo");
        successHandler.setDefaultTargetUrl(adminServer.path("/"));

        http.authorizeHttpRequests(req -> req
                        .requestMatchers(adminServer.path("/assets/**"),
                                          adminServer.path("/login"),
                                          adminServer.path("/variables.css"),
                                          adminServer.path("/instances"),
                                          adminServer.path("/instances/*"),
                                          adminServer.path("/actuator/**"))
                        .permitAll()
                        .anyRequest().authenticated())
                .formLogin(form -> form.loginPage(adminServer.path("/login")).successHandler(successHandler))
                .logout(out -> out.logoutUrl(adminServer.path("/logout")))
                .httpBasic(Customizer.withDefaults())
                .csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .ignoringRequestMatchers(adminServer.path("/instances"),
                                                  adminServer.path("/instances/*"),
                                                  adminServer.path("/actuator/**")));
        return http.build();
    }
}
