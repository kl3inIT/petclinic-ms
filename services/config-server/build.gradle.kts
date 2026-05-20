plugins {
    id("petclinic.spring-boot-service")
}

dependencies {
    implementation(libs.spring.cloud.config.server)
    implementation(libs.micrometer.tracing.bridge.otel)
    runtimeOnly(libs.opentelemetry.exporter.otlp)

    testImplementation(libs.spring.boot.starter.test)
}
