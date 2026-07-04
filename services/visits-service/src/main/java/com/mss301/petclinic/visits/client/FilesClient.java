package com.mss301.petclinic.visits.client;

import java.io.ByteArrayInputStream;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriBuilder;

public class FilesClient {

    private final RestClient restClient;
    private final FilesProperties props;

    public FilesClient(RestClient restClient, FilesProperties props) {
        this.restClient = restClient;
        this.props = props;
    }

    public void upload(String key, String contentType, byte[] bytes) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("file", resource(bytes, contentType))
                .filename("file.bin")
                .contentType(mediaType(contentType));

        restClient.post()
                .uri(uri -> withBucketKey(uri.path("/api/v1/files"), key).build())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .retrieve()
                .toBodilessEntity();
    }

    public byte[] download(String key) {
        return restClient.get()
                .uri(uri -> withBucketKey(uri.path("/api/v1/files/download"), key).build())
                .retrieve()
                .body(byte[].class);
    }

    private UriBuilder withBucketKey(UriBuilder uri, String key) {
        return uri.queryParam("bucket", props.bucket()).queryParam("key", key);
    }

    private static MediaType mediaType(String contentType) {
        return contentType == null || contentType.isBlank()
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(contentType);
    }

    private static InputStreamResource resource(byte[] bytes, String contentType) {
        return new InputStreamResource(new ByteArrayInputStream(bytes)) {
            @Override
            public String getFilename() {
                return "file";
            }

            @Override
            public long contentLength() {
                return bytes.length;
            }
        };
    }
}
