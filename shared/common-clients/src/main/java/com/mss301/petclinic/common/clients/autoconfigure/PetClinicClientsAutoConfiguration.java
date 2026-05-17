package com.mss301.petclinic.common.clients.autoconfigure;

import com.mss301.petclinic.common.clients.interceptor.JwtForwardInterceptor;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestClient;

/**
 * Auto-config cho service-to-service HTTP client infrastructure.
 *
 * <h4>Cung cấp 3 bean</h4>
 * <ol>
 *   <li>{@link JwtForwardInterceptor} — chuyển Bearer token cho downstream</li>
 *   <li>{@code defaultRestClientBuilder} — plain {@link RestClient.Builder}, {@link Primary @Primary}</li>
 *   <li>{@code loadBalancedRestClientBuilder} — {@link LoadBalanced @LoadBalanced} builder
 *       có sẵn JwtForwardInterceptor</li>
 * </ol>
 *
 * <h4>Vì sao CẦN cả 2 builder</h4>
 * Spring Cloud Netflix Eureka 2.x autowire {@code ObjectProvider<RestClient.Builder>}
 * (không qualifier) để gọi {@code http://<eureka-host>:8761/eureka/}. Nếu chỉ có
 * {@code @LoadBalanced} bean, ObjectProvider pick nó → LoadBalancer tưởng hostname
 * "localhost" là service ID → fail. {@code @Primary} plain builder làm Eureka pick
 * non-LB version. {@code @LoadBalanced} chỉ inject khi consumer khai báo qualifier.
 *
 * <h4>Service consume thế nào</h4>
 * <pre>
 * &#64;Bean
 * public CustomersClient customersClient(&#64;LoadBalanced RestClient.Builder lb) {
 *     RestClient c = lb.clone().baseUrl("http://customers-service").build();
 *     return HttpServiceProxyFactory.builderFor(RestClientAdapter.create(c))
 *             .build().createClient(CustomersClient.class);
 * }
 * </pre>
 */
@AutoConfiguration
@ConditionalOnClass({RestClient.class, LoadBalanced.class})
public class PetClinicClientsAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public JwtForwardInterceptor jwtForwardInterceptor() {
        return new JwtForwardInterceptor();
    }

    /**
     * Plain builder — Eureka client + bất kỳ component nào cần builder không-LB.
     * {@code @Primary} đảm bảo unqualified injection pick được không ambiguous.
     */
    @Bean(name = "defaultRestClientBuilder")
    @Primary
    @ConditionalOnMissingBean(name = "defaultRestClientBuilder")
    public RestClient.Builder defaultRestClientBuilder() {
        return RestClient.builder();
    }

    /**
     * LoadBalanced builder — consumer inject với {@link LoadBalanced @LoadBalanced} qualifier
     * mới pick. URI dạng {@code http://<service-name>/...} resolve qua Eureka.
     */
    @Bean(name = "loadBalancedRestClientBuilder")
    @LoadBalanced
    @ConditionalOnMissingBean(name = "loadBalancedRestClientBuilder")
    public RestClient.Builder loadBalancedRestClientBuilder(JwtForwardInterceptor jwtForward) {
        return RestClient.builder().requestInterceptor(jwtForward);
    }
}
