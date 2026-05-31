package com.mss301.petclinic.workflow.config;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CamundaOperateConfig {

    @Bean("camundaOperateBaseUrl")
    String camundaOperateBaseUrl(
            @Value("${camunda.client.rest-address:http://localhost:8088}") String baseUrl) {
        return baseUrl;
    }

    @Bean("camundaOperateBasicAuth")
    String camundaOperateBasicAuth(
            @Value("${camunda.client.operate.username:admin}") String username,
            @Value("${camunda.client.operate.password:admin}") String password) {
        return "Basic " + Base64.getEncoder()
                .encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Plain JDK HttpClient — zero Spring interceptors, handles cookies automatically.
     * Gọi Camunda 8 Orchestration Cluster v2 REST API (gateway tại {@code rest-address}).
     *
     * <p>{@code connectTimeout} bắt buộc: JDK HttpClient mặc định chờ vô hạn khi connect →
     * nếu Camunda down/unreachable, thread treo mãi. Read timeout đặt per-request bằng
     * {@code HttpRequest.timeout(...)} ở các service impl (client không có read-timeout cấp client).
     */
    @Bean("camundaOperateHttpClient")
    HttpClient camundaOperateHttpClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }
}
