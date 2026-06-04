package com.mss301.petclinic.common.storage;

import java.io.InputStream;
import java.net.URL;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.paginators.ListObjectsV2Iterable;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

/**
 * S3-compatible storage impl (AWS SDK v2). Bucket lấy từ {@link StorageProperties#bucket()}.
 * Object key được tính ở caller (vd {@code vets/photo/123}, {@code prescriptions/9/3.pdf}) —
 * service này KHÔNG biết domain. Wire qua {@code PetClinicStorageAutoConfiguration} (plain
 * class, không {@code @Service}, để autoconfig kiểm soát đời sống bean).
 */
public class MinioStorageService implements StorageService {

    private final S3Client s3;
    private final S3Presigner presigner;
    private final StorageProperties props;

    public MinioStorageService(S3Client s3, S3Presigner presigner, StorageProperties props) {
        this.s3 = s3;
        this.presigner = presigner;
        this.props = props;
    }

    @Override
    public void upload(String key, String contentType, InputStream input, long contentLength) {
        PutObjectRequest req = PutObjectRequest.builder()
                .bucket(props.bucket())
                .key(key)
                .contentType(contentType)
                .contentLength(contentLength)
                .build();
        // contentLength BẮT BUỘC truyền vào RequestBody — S3 SDK cần biết length tổng
        // để stream multipart đúng. Truyền sai length → S3 reject "Content-Length mismatch".
        s3.putObject(req, RequestBody.fromInputStream(input, contentLength));
    }

    @Override
    public void delete(String key) {
        s3.deleteObject(DeleteObjectRequest.builder()
                .bucket(props.bucket())
                .key(key)
                .build());
    }

    @Override
    public InputStream download(String key) {
        // ResponseInputStream<GetObjectResponse> là InputStream — caller close().
        return s3.getObject(GetObjectRequest.builder()
                .bucket(props.bucket())
                .key(key)
                .build());
    }

    @Override
    public URL presignedGet(String key, Duration ttl) {
        GetObjectRequest get = GetObjectRequest.builder()
                .bucket(props.bucket())
                .key(key)
                .build();
        GetObjectPresignRequest presign = GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(get)
                .build();
        return presigner.presignGetObject(presign).url();
    }

    @Override
    public List<StorageObject> list(String prefix) {
        // ListObjectsV2Iterable tự auto-paginate qua continuation token — caller không cần
        // quản lý nextToken. Mỗi page mặc định 1000 keys.
        ListObjectsV2Request req = ListObjectsV2Request.builder()
                .bucket(props.bucket())
                .prefix(prefix)
                .build();
        ListObjectsV2Iterable pages = s3.listObjectsV2Paginator(req);
        return pages.contents().stream()
                .map(o -> new StorageObject(o.key(), o.lastModified(), o.size()))
                .collect(Collectors.toList());
    }
}
