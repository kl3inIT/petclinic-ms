package com.mss301.petclinic.common.storage.autoconfigure;

import java.net.URI;
import java.net.URISyntaxException;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

import com.mss301.petclinic.common.storage.MinioStorageService;
import com.mss301.petclinic.common.storage.StorageProperties;
import com.mss301.petclinic.common.storage.StorageService;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Auto-config cho S3-compatible storage (MinIO local / AWS S3 prod). Service chỉ cần
 * {@code implementation(project(":shared:common-storage"))} + khai báo
 * {@code petclinic.storage.minio.*} là có ngay {@link StorageService}.
 *
 * <h4>Cung cấp 3 bean</h4>
 * <ol>
 *   <li>{@link S3Client} — sync client, path-style addressing (bắt buộc cho MinIO)</li>
 *   <li>{@link S3Presigner} — sinh presigned GET URL</li>
 *   <li>{@link StorageService} ({@link MinioStorageService}) — abstraction upload/download/list</li>
 * </ol>
 * Tất cả {@link ConditionalOnMissingBean @ConditionalOnMissingBean} để service override.
 *
 * <h4>Path-style addressing</h4>
 * MinIO không support subdomain-style bucket URL — set {@code pathStyleAccessEnabled(true)}
 * ép {@code http://host:9000/bucket/key}. AWS S3 prod cũng accept path-style.
 *
 * <h4>Region</h4>
 * MinIO không quan tâm region; set {@code us-east-1} để SDK pass signature v4.
 */
@AutoConfiguration
@ConditionalOnClass(S3Client.class)
@EnableConfigurationProperties(StorageProperties.class)
public class PetClinicStorageAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
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
    @ConditionalOnMissingBean
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

    @Bean
    @ConditionalOnMissingBean
    public StorageService storageService(S3Client s3, S3Presigner presigner, StorageProperties props) {
        return new MinioStorageService(s3, presigner, props);
    }

    private static URI toUri(String endpoint) {
        try {
            return new URI(endpoint);
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("Invalid storage endpoint: " + endpoint, e);
        }
    }
}
