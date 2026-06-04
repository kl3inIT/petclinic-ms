plugins {
    id("petclinic.shared-library")
}

dependencies {
    // `api` — service consume thấy S3Client/S3Presigner + StorageService.
    // aws-sdk-s3 kéo theo `s3-presigner` cùng SDK, không cần khai báo riêng.
    api(libs.aws.sdk.s3)

    // compileOnly — record @ConfigurationProperties + @Validated + jakarta constraints.
    // Service consumer tự bring runtime (spring-boot + validation).
    compileOnly("org.springframework.boot:spring-boot-autoconfigure")
    compileOnly("org.springframework.boot:spring-boot-starter-validation")

    annotationProcessor("org.springframework.boot:spring-boot-autoconfigure-processor")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
}
