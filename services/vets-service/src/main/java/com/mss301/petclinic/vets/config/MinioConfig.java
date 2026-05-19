package com.mss301.petclinic.vets.config;

import java.net.URI;
import java.net.URISyntaxException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * S3 client + presigner cho MinIO local / AWS S3 prod.
 *
 * <h4>Path-style addressing (bắt buộc cho MinIO)</h4>
 * MinIO không support subdomain-style bucket URL (vd {@code https://my-bucket.s3.amazonaws.com}) —
 * AWS SDK mặc định thử subdomain trước. Set {@code pathStyleAccessEnabled(true)} ép URL dạng
 * {@code http://localhost:9000/my-bucket/key}. AWS S3 prod cũng accept path-style, an toàn để dùng chung.
 *
 * <h4>Region</h4>
 * MinIO không quan tâm region. Set {@code us-east-1} (default phổ biến) để SDK pass signature v4.
 */
@Configuration
public class MinioConfig {

    @Bean
    public S3Client s3Client(StorageProperties props) {
        return S3Client.builder()
                .endpointOverride(toUri(props.endpoint()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(props.accessKey(), props.secretKey())))
                .region(Region.US_EAST_1)
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }

    @Bean
    public S3Presigner s3Presigner(StorageProperties props) {
        return S3Presigner.builder()
                .endpointOverride(toUri(props.endpoint()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(props.accessKey(), props.secretKey())))
                .region(Region.US_EAST_1)
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }

    private static URI toUri(String endpoint) {
        try {
            return new URI(endpoint);
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("Invalid storage endpoint: " + endpoint, e);
        }
    }
}
