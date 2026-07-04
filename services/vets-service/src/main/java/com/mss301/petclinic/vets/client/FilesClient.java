package com.mss301.petclinic.vets.client;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

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

    public URL presignedUrl(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        PresignedResponse response = restClient.get()
                .uri(uri -> withBucketKey(uri.path("/api/v1/files/presigned"), key)
                        .queryParam("ttlSeconds", seconds(props.presignedTtl()))
                        .build())
                .retrieve()
                .body(PresignedResponse.class);
        return response == null ? null : toUrl(response.url());
    }

    public String presignedUrlString(String key) {
        URL url = presignedUrl(key);
        return url == null ? null : url.toString();
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

    public List<FileObjectResponse> list(String prefix) {
        FileObjectResponse[] response = restClient.get()
                .uri(uri -> uri.path("/api/v1/files")
                        .queryParam("bucket", props.bucket())
                        .queryParam("prefix", prefix)
                        .build())
                .retrieve()
                .body(FileObjectResponse[].class);
        return response == null ? List.of() : Arrays.asList(response);
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

    private static URL toUrl(String value) {
        try {
            return URI.create(value).toURL();
        } catch (IllegalArgumentException | MalformedURLException e) {
            throw new IllegalStateException("files-service returned invalid presigned URL", e);
        }
    }

    public record PresignedResponse(String url, long expiresInSeconds) {}
    public record FileObjectResponse(String key, Instant lastModified, long sizeBytes) {}
}
