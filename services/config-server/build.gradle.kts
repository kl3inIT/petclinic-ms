plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    implementation(libs.spring.cloud.config.server)
    implementation(libs.micrometer.tracing.bridge.otel)

    testImplementation(libs.spring.boot.starter.test)
}
