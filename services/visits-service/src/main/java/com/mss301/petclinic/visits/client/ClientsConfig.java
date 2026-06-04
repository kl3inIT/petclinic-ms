package com.mss301.petclinic.visits.client;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

/**
 * Wire HTTP Interface clients cho visits-service.
 *
 * <p>RestClient.Builder ({@code @LoadBalanced} + plain @Primary) đến từ common-clients
 * autoconfig — service không cần khai báo lại.
 */
@Configuration
public class ClientsConfig {

    @Bean
    public CustomersClient customersClient(@LoadBalanced RestClient.Builder lbBuilder) {
        RestClient client = lbBuilder.clone()
                .baseUrl("http://customers-service")
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(client))
                .build()
                .createClient(CustomersClient.class);
    }

    @Bean
    public VetsClient vetsClient(@LoadBalanced RestClient.Builder lbBuilder) {
        RestClient client = lbBuilder.clone()
                .baseUrl("http://vets-service")
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(client))
                .build()
                .createClient(VetsClient.class);
    }

    @Bean
    public UsersClient usersClient(@LoadBalanced RestClient.Builder lbBuilder) {
        RestClient client = lbBuilder.clone()
                .baseUrl("http://auth-service")
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(client))
                .build()
                .createClient(UsersClient.class);
    }

    @Bean
    public WorkflowServiceClient workflowServiceClient(@LoadBalanced RestClient.Builder lbBuilder) {
        RestClient client = lbBuilder.clone()
                .baseUrl("http://workflow-service")
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(client))
                .build()
                .createClient(WorkflowServiceClient.class);
    }

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
