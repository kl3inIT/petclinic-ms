plugins {
    id("petclinic.shared-library")
}

dependencies {
    // DataExceptionTranslator dùng ErrorConstants + ProblemDetail format → cần common-web.
    api(project(":shared:common-web"))

    // Enum interfaces là plain Java, không cần Spring. Nhưng auditing entity + auto-config cần JPA + Spring Data.
    api("jakarta.persistence:jakarta.persistence-api")               // @MappedSuperclass, @Column

    compileOnly("org.springframework.boot:spring-boot-autoconfigure")
    compileOnly("org.springframework.data:spring-data-jpa")          // @EntityListeners(AuditingEntityListener)
    compileOnly("org.springframework.data:spring-data-commons")      // @CreatedBy, @CreatedDate...
    compileOnly("org.springframework:spring-tx")                     // ConcurrencyFailureException
    compileOnly("org.springframework:spring-web")                    // @RestControllerAdvice, ResponseEntity

    annotationProcessor("org.springframework.boot:spring-boot-autoconfigure-processor")
}
