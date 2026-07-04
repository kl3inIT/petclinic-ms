# files-service

Go service that owns MinIO/S3 object operations for petclinic-ms.

Java domain services keep their own metadata and business rules. They call this
service for binary object operations only: upload, delete, presign, download,
and list.

## Local run

```bash
docker compose --profile storage up -d
cd services/files-service
go run ./cmd/files
```

Default HTTP port: `8193`.
