package com.mss301.petclinic.mcp.client;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

/**
 * Wire HTTP Interface clients sang 3 downstream service qua Eureka LB.
 *
 * <p>{@code @LoadBalanced RestClient.Builder} đến từ {@code shared/common-clients}
 * autoconfig — đã có sẵn {@code JwtForwardInterceptor} chuyển Bearer token nếu có
 * {@code SecurityContext}. Phase 12a (test với mcp-inspector) chưa có security context,
 * downstream sẽ 401 cho protected endpoints — read-only endpoints không cần auth vẫn pass.
 *
 * <p>Phase 12b (genai-service) gọi vào → có JWT user → forward đầy đủ.
 */
@Configuration
public class ClientsConfig {

    @Bean
    public CustomersClient customersClient(@LoadBalanced RestClient.Builder lbBuilder) {
        return buildClient(lbBuilder, "http://customers-service", CustomersClient.class);
    }

    @Bean
    public VetsClient vetsClient(@LoadBalanced RestClient.Builder lbBuilder) {
        return buildClient(lbBuilder, "http://vets-service", VetsClient.class);
    }

    @Bean
    public VisitsClient visitsClient(@LoadBalanced RestClient.Builder lbBuilder) {
        return buildClient(lbBuilder, "http://visits-service", VisitsClient.class);
    }

    private static <T> T buildClient(RestClient.Builder lbBuilder, String baseUrl, Class<T> iface) {
        RestClient restClient = lbBuilder.clone().baseUrl(baseUrl).build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build()
                .createClient(iface);
    }
}
