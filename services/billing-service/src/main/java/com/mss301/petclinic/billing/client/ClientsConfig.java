package com.mss301.petclinic.billing.client;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

/**
 * Wire HTTP Interface client cho billing-service.
 *
 * <p>RestClient.Builder ({@code @LoadBalanced} + plain @Primary) đến từ common-clients
 * autoconfig — service không khai báo lại.
 */
@Configuration
public class ClientsConfig {

    @Bean
    public ProductsClient productsClient(@LoadBalanced RestClient.Builder lbBuilder) {
        RestClient client = lbBuilder.clone()
                .baseUrl("http://products-service")
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(client))
                .build()
                .createClient(ProductsClient.class);
    }
}
