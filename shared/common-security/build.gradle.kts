plugins {
    id("petclinic.shared-library")
}

dependencies {
    // api(): downstream service không phải khai báo lại
    api("org.springframework.boot:spring-boot-starter-security")
    api("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    api("org.springframework.boot:spring-boot-starter-web")          // SecurityFilterChain cần
    api(project(":shared:common-web"))                               // ErrorConstants cho Auth EntryPoint

    compileOnly("org.springframework.boot:spring-boot-autoconfigure")
    compileOnly("org.springframework.boot:spring-boot-autoconfigure-processor")

    annotationProcessor("org.springframework.boot:spring-boot-autoconfigure-processor")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
}
