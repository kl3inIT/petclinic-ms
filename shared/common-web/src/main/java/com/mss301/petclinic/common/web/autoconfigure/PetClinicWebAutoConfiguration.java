package com.mss301.petclinic.common.web.autoconfigure;

import com.mss301.petclinic.common.web.exception.ExceptionTranslator;
import com.mss301.petclinic.common.web.openapi.PetClinicOpenApiCustomizer;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;

/**
 * Auto-config cho common-web. Active khi service có classpath chứa Spring Web.
 *
 * Bean nào service đã tự khai báo (@ConditionalOnMissingBean) sẽ KHÔNG bị override —
 * service vẫn có thể override ExceptionTranslator nếu cần custom.
 */
@AutoConfiguration
@ConditionalOnWebApplication
@ConditionalOnClass(org.springframework.web.bind.annotation.RestControllerAdvice.class)
public class PetClinicWebAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public ExceptionTranslator petclinicExceptionTranslator() {
        return new ExceptionTranslator();
    }

    @Bean
    @ConditionalOnMissingBean(name = "petclinicOpenApiCustomizer")
    @ConditionalOnClass(OpenApiCustomizer.class)
    public OpenApiCustomizer petclinicOpenApiCustomizer(
            @Value("${spring.application.name:application}") String applicationName
    ) {
        return new PetClinicOpenApiCustomizer(applicationName);
    }
}
