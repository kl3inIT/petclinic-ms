package com.mss301.petclinic.customers.client;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(FilesProperties.class)
public class FilesClientConfig {

    @Bean
    public FilesClient filesClient(RestClient.Builder builder, FilesProperties props) {
        return new FilesClient(builder.clone().baseUrl(props.baseUrl()).build(), props);
    }
}
