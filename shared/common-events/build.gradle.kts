plugins {
    id("petclinic.shared-library")
}

dependencies {
    // `api` — service consume sẽ thấy RabbitTemplate, Queue, Declarables, MessageConverter
    api("org.springframework.boot:spring-boot-starter-amqp")

    // compileOnly — autoconfig + properties; service phải tự bring runtime (Boot starter của họ đã có)
    compileOnly("org.springframework.boot:spring-boot-autoconfigure")

    annotationProcessor("org.springframework.boot:spring-boot-autoconfigure-processor")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
}
