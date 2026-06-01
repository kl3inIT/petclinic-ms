plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    implementation(project(":shared:common-web"))
    implementation(project(":shared:common-security"))
    implementation(project(":shared:common-clients"))

    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.validation)
    implementation(libs.springdoc.openapi.starter.webmvc.ui)
    implementation(libs.spring.cloud.starter.netflix.eureka.client)
    implementation(libs.spring.cloud.starter.config)

    implementation("org.springframework.cloud:spring-cloud-starter-loadbalancer")

    // Camunda 8 client/job workers. Engine runs remotely (Self-Managed/SaaS), not embedded.
    implementation(libs.camunda.spring.boot.starter)

    // Apache Camel — HTTP integration từ BPMN service tasks
    implementation(platform(libs.camel.spring.boot.bom))
    implementation(libs.camel.spring.boot.starter)
    implementation(libs.camel.http.starter)

    implementation(libs.micrometer.tracing.bridge.otel)

    developmentOnly(libs.spring.boot.docker.compose)

    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")

    testImplementation(libs.spring.boot.starter.test)
}
