package com.mss301.petclinic.common.jpa.audit;

import java.util.Optional;

import org.springframework.data.domain.AuditorAware;

/**
 * AuditorAware mặc định — trả về "system" cho dev/test. Khi tích hợp Spring Security,
 * service tự define bean {@code AuditorAware<String>} đọc {@code SecurityContext} → override
 * cái này (vì {@code @ConditionalOnMissingBean}).
 */
public class SystemAuditorAware implements AuditorAware<String> {

    public static final String SYSTEM_USER = "system";

    @Override
    public Optional<String> getCurrentAuditor() {
        return Optional.of(SYSTEM_USER);
    }
}
