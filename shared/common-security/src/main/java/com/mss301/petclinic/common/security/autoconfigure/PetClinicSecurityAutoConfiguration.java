package com.mss301.petclinic.common.security.autoconfigure;

import com.mss301.petclinic.common.security.jwt.PetClinicJwtProperties;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.List;

/**
 * Common security auto-config — RSA + JWKS pattern (production-grade từ đầu).
 *
 * <h4>Cung cấp</h4>
 * <ul>
 *   <li>{@link JwtDecoder} via {@code NimbusJwtDecoder.withJwkSetUri()} — fetch public keys
 *       từ auth-service tự động, cache theo {@code Cache-Control}.</li>
 *   <li>{@link JwtAuthenticationConverter} — map JWT {@code roles} claim → {@code ROLE_*} authorities</li>
 *   <li>Token validators: signature (Nimbus), {@code exp}/{@code nbf} (timestamp),
 *       {@code iss} (issuer match), {@code aud} (audience match).</li>
 *   <li>Default {@link SecurityFilterChain} — stateless, JWT bearer, /actuator/health permitAll</li>
 * </ul>
 *
 * <h4>Service override</h4>
 * Service có public endpoints riêng (auth-service /register/login, gateway /fallback)
 * tự khai báo {@link SecurityFilterChain} — default chain tự lùi.
 */
@AutoConfiguration
@ConditionalOnClass({SecurityFilterChain.class, JwtDecoder.class})
@EnableConfigurationProperties(PetClinicJwtProperties.class)
public class PetClinicSecurityAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public JwtDecoder jwtDecoder(PetClinicJwtProperties props) {
        if (props.jwkSetUri() == null || props.jwkSetUri().isBlank()) {
            throw new IllegalStateException(
                    "petclinic.auth.jwt.jwk-set-uri is required when common-security is on classpath. " +
                    "Set it in config-repo (vd: http://localhost:8183/.well-known/jwks.json)."
            );
        }
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(props.jwkSetUri()).build();
        decoder.setJwtValidator(buildValidators(props));
        return decoder;
    }

    /**
     * Build composite validator: signature + timestamp (default) + issuer + audience.
     * Tách method để cô lập {@code @SuppressWarnings} — varargs của
     * {@link JwtValidators#createDefaultWithValidators(OAuth2TokenValidator[])}
     * tạo generic array, không thể tránh unchecked warning theo type system Java.
     */
    @SuppressWarnings("unchecked")
    private static OAuth2TokenValidator<Jwt> buildValidators(PetClinicJwtProperties props) {
        return JwtValidators.createDefaultWithValidators(
                new JwtTimestampValidator(),
                new JwtClaimValidator<String>("iss", props.issuer()::equals),
                new JwtClaimValidator<List<String>>("aud",
                        aud -> aud != null && aud.contains(props.audience()))
        );
    }

    @Bean
    @ConditionalOnMissingBean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter granted = new JwtGrantedAuthoritiesConverter();
        granted.setAuthoritiesClaimName("roles");
        granted.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter conv = new JwtAuthenticationConverter();
        conv.setJwtGrantedAuthoritiesConverter(granted);
        conv.setPrincipalClaimName("sub");
        return conv;
    }

    @Bean
    @ConditionalOnMissingBean
    public SecurityFilterChain defaultSecurityFilterChain(
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
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}
