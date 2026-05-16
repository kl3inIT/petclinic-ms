package com.mss301.petclinic.customers.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customersOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Customers Service API")
                .version("v1")
                .description("Owner & Pet management — petclinic-ms / MSS301")
                .contact(new Contact().name("petclinic-ms"))
                .license(new License().name("MIT")));
    }
}
