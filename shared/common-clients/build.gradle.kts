plugins {
    id("petclinic.shared-library")
}

// Cần Spring Cloud BOM cho spring-cloud-starter-loadbalancer (Boot BOM không cover spring-cloud-*)
val libs = the<org.gradle.accessors.dm.LibrariesForLibs>()
dependencyManagement {
    imports {
        mavenBom("org.springframework.cloud:spring-cloud-dependencies:${libs.versions.springCloud.get()}")
    }
}

dependencies {
    // `api` — service consume sẽ thấy RestClient + HttpServiceProxyFactory
    api("org.springframework:spring-web")

    // compileOnly — service phải tự bring runtime
    compileOnly("org.springframework.boot:spring-boot-autoconfigure")
    compileOnly("org.springframework.cloud:spring-cloud-starter-loadbalancer")  // @LoadBalanced + lb:// support
    compileOnly("org.springframework.boot:spring-boot-starter-oauth2-resource-server")  // SecurityContextHolder JwtAuth

    annotationProcessor("org.springframework.boot:spring-boot-autoconfigure-processor")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
}
