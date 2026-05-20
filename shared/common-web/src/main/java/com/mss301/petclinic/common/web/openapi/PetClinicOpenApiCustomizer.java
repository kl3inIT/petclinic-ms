package com.mss301.petclinic.common.web.openapi;

import org.springdoc.core.customizers.OpenApiCustomizer;

import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;

/**
 * Mặc định OpenAPI info cho tất cả service. Service muốn override title/description thì tạo
 * {@code @Bean OpenAPI} riêng — springdoc ưu tiên cái đó hơn customizer.
 */
public class PetClinicOpenApiCustomizer implements OpenApiCustomizer {

    private final String applicationName;

    public PetClinicOpenApiCustomizer(String applicationName) {
        this.applicationName = applicationName;
    }

    @Override
    public void customise(io.swagger.v3.oas.models.OpenAPI openApi) {
        Info info = openApi.getInfo();
        if (info == null) {
            info = new Info();
            openApi.setInfo(info);
        }
        if (info.getTitle() == null) {
            info.setTitle(toTitle(applicationName) + " API");
        }
        if (info.getVersion() == null) {
            info.setVersion("v1");
        }
        if (info.getDescription() == null) {
            info.setDescription(applicationName + " — petclinic-ms / MSS301");
        }
        if (info.getContact() == null) {
            info.setContact(new Contact().name("petclinic-ms"));
        }
        if (info.getLicense() == null) {
            info.setLicense(new License().name("MIT"));
        }
    }

    private static String toTitle(String name) {
        // "customers-service" → "Customers Service"
        String[] parts = name.split("-");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p.isEmpty()) continue;
            if (!sb.isEmpty()) sb.append(' ');
            sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
        }
        return sb.toString();
    }
}
