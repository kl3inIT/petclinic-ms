package com.mss301.petclinic.workflow.delegate;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mss301.petclinic.workflow.config.WorkflowProperties;

import io.camunda.client.annotation.JobWorker;

/**
 * Camunda 8 job worker — gọi vets-service qua LoadBalancer (Eureka).
 */
@Component
public class CallVetsServiceDelegate {

    private static final Logger log = LoggerFactory.getLogger(CallVetsServiceDelegate.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final WorkflowProperties workflowProperties;

    public CallVetsServiceDelegate(
            @LoadBalanced RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            WorkflowProperties workflowProperties
    ) {
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
        this.workflowProperties = workflowProperties;
    }

    @JobWorker(type = "call-vets-service")
    public Map<String, Object> callVetsService() {
        String vetsUrl = workflowProperties.vetsListUrl();
        try {
            String responseBody = restClient.get()
                    .uri(vetsUrl)
                    .retrieve()
                    .body(String.class);

            JsonNode vets = objectMapper.readTree(responseBody);
            int vetCount = vets.isArray() ? vets.size() : (vets.has("content") ? vets.get("content").size() : 0);
            JsonNode firstVet = vets.isArray() && vetCount > 0
                    ? vets.get(0)
                    : (vets.has("content") && vets.get("content").size() > 0 ? vets.get("content").get(0) : null);

            String firstVetName = firstVet != null
                    ? firstVet.path("firstName").asText("") + " " + firstVet.path("lastName").asText("")
                    : "";

            log.info("Called vets-service, vetCount={}, firstVetName='{}'", vetCount, firstVetName.trim());

            return Map.of(
                    "vetsServiceStatus", "OK",
                    "vetCount", vetCount,
                    "firstVetName", firstVetName.trim()
            );
        } catch (RestClientException | JsonProcessingException e) {
            log.warn("vets-service unavailable at {} — returning degraded result: {}", vetsUrl, e.getMessage());
            return Map.of(
                    "vetsServiceStatus", "UNAVAILABLE",
                    "vetCount", 0,
                    "firstVetName", ""
            );
        }
    }
}
