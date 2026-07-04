package com.mss301.petclinic.customers.client;

import java.io.IOException;
import java.time.Duration;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriBuilder;

public class FilesClient {

    private final RestClient restClient;
    private final FilesProperties props;

    public FilesClient(RestClient restClient, FilesProperties props) {
        this.restClient = restClient;
        this.props = props;
    }

    public long maxFileSizeBytes() {
        return props.maxFileSizeBytes();
    }

    public String presignedUrl(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        PresignedResponse response = restClient.get()
                .uri(uri -> withBucketKey(uri.path("/api/v1/files/presigned"), key)
                        .queryParam("ttlSeconds", seconds(props.presignedTtl()))
                        .build())
                .retrieve()
                .body(PresignedResponse.class);
        return response == null ? null : response.url();
    }

    public void upload(String key, MultipartFile file) throws IOException {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("file", resource(file))
                .filename(filename(file))
                .contentType(contentType(file));

        restClient.post()
                .uri(uri -> withBucketKey(uri.path("/api/v1/files"), key).build())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .retrieve()
                .toBodilessEntity();
    }

    public void delete(String key) {
        restClient.delete()
                .uri(uri -> withBucketKey(uri.path("/api/v1/files"), key).build())
                .retrieve()
                .toBodilessEntity();
    }

    private UriBuilder withBucketKey(UriBuilder uri, String key) {
        return uri.queryParam("bucket", props.bucket()).queryParam("key", key);
    }

    private static long seconds(Duration duration) {
        return duration == null ? 3600 : duration.toSeconds();
    }

    private static MediaType contentType(MultipartFile file) {
        String value = file.getContentType();
        return value == null || value.isBlank()
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(value);
    }

    private static String filename(MultipartFile file) {
        String value = file.getOriginalFilename();
        return value == null || value.isBlank() ? "upload.bin" : value;
    }

    private static InputStreamResource resource(MultipartFile file) throws IOException {
        return new InputStreamResource(file.getInputStream()) {
            @Override
            public String getFilename() {
                return filename(file);
            }

            @Override
            public long contentLength() {
                return file.getSize();
            }
        };
    }

    public record PresignedResponse(String url, long expiresInSeconds) {}
}
