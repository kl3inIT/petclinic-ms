package com.mss301.petclinic.workflow.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Cấu hình workflow — URL downstream cho Java delegates (Eureka service name + path).
 */
@ConfigurationProperties(prefix = "petclinic.workflow")
public record WorkflowProperties(
        @DefaultValue("http://vets-service") String vetsServiceBaseUrl,
        @DefaultValue("http://visits-service") String visitsServiceBaseUrl
) {

    public String vetsListUrl() {
        return vetsServiceBaseUrl + "/api/v1/vets";
    }
}
