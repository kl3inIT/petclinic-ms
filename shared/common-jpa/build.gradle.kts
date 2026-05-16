plugins {
    id("petclinic.shared-library")
}

dependencies {
    // Enum interfaces là plain Java, không cần Spring. Nhưng auditing entity + auto-config cần JPA + Spring Data.
    api("jakarta.persistence:jakarta.persistence-api")               // @MappedSuperclass, @Column

    compileOnly("org.springframework.boot:spring-boot-autoconfigure")
    compileOnly("org.springframework.data:spring-data-jpa")          // @EntityListeners(AuditingEntityListener)
    compileOnly("org.springframework.data:spring-data-commons")      // @CreatedBy, @CreatedDate...

    annotationProcessor("org.springframework.boot:spring-boot-autoconfigure-processor")
}
