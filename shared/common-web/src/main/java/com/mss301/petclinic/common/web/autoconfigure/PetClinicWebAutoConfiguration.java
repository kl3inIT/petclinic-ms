package com.mss301.petclinic.common.web.autoconfigure;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.mss301.petclinic.common.web.exception.ExceptionTranslator;
import com.mss301.petclinic.common.web.openapi.PetClinicOpenApiCustomizer;

/**
 * Auto-config cho common-web. Active khi service có classpath chứa Spring Web.
 *
 * Bean nào service đã tự khai báo (@ConditionalOnMissingBean) sẽ KHÔNG bị override —
 * service vẫn có thể override ExceptionTranslator nếu cần custom.
 *
 * <h4>OpenAPI sub-config tách riêng</h4>
 * Nested config có {@code @ConditionalOnClass(OpenApiCustomizer.class)} — khi springdoc
 * KHÔNG có trên classpath (vd: gateway), Spring skip cả nested class trước khi introspect
 * return type. Đặt {@code @ConditionalOnClass} ngay trên bean method KHÔNG đủ vì Spring
 * vẫn phải đọc method signature, gây {@code NoClassDefFoundError}.
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

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnClass(org.springdoc.core.customizers.OpenApiCustomizer.class)
    static class OpenApiConfig {

        @Bean
        @ConditionalOnMissingBean(name = "petclinicOpenApiCustomizer")
        public org.springdoc.core.customizers.OpenApiCustomizer petclinicOpenApiCustomizer(
                @Value("${spring.application.name:application}") String applicationName
        ) {
            return new PetClinicOpenApiCustomizer(applicationName);
        }
    }
}
