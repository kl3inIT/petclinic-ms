package com.mss301.petclinic.workflow.delegate;

import static com.mss301.petclinic.workflow.camel.HttpCallRoute.ROUTE_URI;

import java.util.HashMap;
import java.util.Map;

import org.apache.camel.CamelExecutionException;
import org.apache.camel.Exchange;
import org.apache.camel.ProducerTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import io.camunda.client.annotation.JobWorker;
import io.camunda.client.api.response.ActivatedJob;

/**
 * Generic HTTP job worker qua Camel — URL/method/body cấu hình bằng custom headers hoặc variables.
 */
@Component
public class CamelHttpCallDelegate {

    private static final Logger log = LoggerFactory.getLogger(CamelHttpCallDelegate.class);

    private final ProducerTemplate producerTemplate;

    public CamelHttpCallDelegate(ProducerTemplate producerTemplate) {
        this.producerTemplate = producerTemplate;
    }

    @JobWorker(type = "camel-http-call")
    public Map<String, Object> callHttp(ActivatedJob job) {
        Map<String, Object> variables = job.getVariablesAsMap();
        Map<String, String> headers = job.getCustomHeaders();
        String resolvedMethod = readValue(headers, variables, "method", "GET").toUpperCase();
        String resolvedUrl = readValue(headers, variables, "url", null);
        String resolvedBody = readValue(headers, variables, "body", null);
        String resolvedContentType = readValue(headers, variables, "contentType", "application/json");
        String resolvedResultVariable = readValue(headers, variables, "resultVariable", "camelHttpResponse");

        if (resolvedUrl == null || resolvedUrl.isBlank()) {
            throw new IllegalArgumentException("Header or variable 'url' is required for camel-http-call");
        }

        try {
            Exchange result = producerTemplate.request(ROUTE_URI, exchange -> {
                exchange.setProperty("targetUrl", resolvedUrl);
                exchange.setProperty("httpMethod", resolvedMethod);
                exchange.setProperty("contentType", resolvedContentType);
                exchange.getMessage().setBody(resolvedBody);
            });

            Integer statusCode = result.getMessage().getHeader(Exchange.HTTP_RESPONSE_CODE, Integer.class);
            String responseBody = result.getMessage().getBody(String.class);

            log.info("Camel HTTP call completed processInstanceKey={}, method={}, url={}, status={}",
                    job.getProcessInstanceKey(), resolvedMethod, resolvedUrl, statusCode);

            Map<String, Object> resultVariables = new HashMap<>();
            resultVariables.put(resolvedResultVariable, responseBody);
            resultVariables.put(resolvedResultVariable + "StatusCode", statusCode);
            return resultVariables;
        } catch (CamelExecutionException e) {
            log.error("Camel HTTP call failed method={}, url={}", resolvedMethod, resolvedUrl, e);
            throw e;
        }
    }

    private static String readValue(
            Map<String, String> headers,
            Map<String, Object> variables,
            String key,
            String defaultValue
    ) {
        Object value = headers.containsKey(key) ? headers.get(key) : variables.get(key);
        if (value == null) {
            return defaultValue;
        }
        String stringValue = value.toString();
        return stringValue.isBlank() ? defaultValue : stringValue;
    }
}
