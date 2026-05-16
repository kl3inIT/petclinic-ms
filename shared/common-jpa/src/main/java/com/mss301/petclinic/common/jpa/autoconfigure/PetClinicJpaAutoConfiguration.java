package com.mss301.petclinic.common.jpa.autoconfigure;

import com.mss301.petclinic.common.jpa.audit.SystemAuditorAware;
import com.mss301.petclinic.common.jpa.exception.DataExceptionTranslator;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Auto-config active khi classpath có Spring Data JPA.
 * Bật JPA Auditing + cung cấp {@link AuditorAware} mặc định.
 */
@AutoConfiguration
@ConditionalOnClass(JpaRepository.class)
@EnableJpaAuditing(auditorAwareRef = "petclinicAuditorAware")
public class PetClinicJpaAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(AuditorAware.class)
    public AuditorAware<String> petclinicAuditorAware() {
        return new SystemAuditorAware();
    }

    @Bean
    @ConditionalOnMissingBean
    public DataExceptionTranslator petclinicDataExceptionTranslator() {
        return new DataExceptionTranslator();
    }
}
