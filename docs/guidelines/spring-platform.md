# Spring Platform Guidelines

Reusable Spring and infrastructure mechanics live here. Current service facts
live in `ARCHITECTURE.md`.

## Spring Boot 4

- Use Spring Boot starters rather than raw third-party dependencies where a
  starter exists.
- Keep dependency versions in `gradle/libs.versions.toml` or managed BOMs.
- `spring.mvc.problemdetails.enabled=true` is required for native
  `ProblemDetail` handling.
- Shared auto-configuration uses
  `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`.

## RestClient And Eureka

`common-clients` intentionally provides two `RestClient.Builder` beans:

- a plain primary builder for framework consumers such as Eureka,
- a load-balanced builder for service-to-service HTTP interfaces.

Do not remove the plain builder. If Eureka receives only the load-balanced
builder, it can try to resolve `localhost` as a service name.

## Events

- Events go through `EventPublisher`.
- Consumers declare per-service queues with DLQs.
- Consumers use tolerant-reader DTOs instead of importing publisher records.
- Event handlers must be idempotent because RabbitMQ does not provide
  exactly-once delivery.
- Production-grade money workflows should move to transactional outbox before
  relying on exactly-once business effects.

## Resilience4j

Circuit-breaker methods must be called across a Spring bean boundary. Self
invocation bypasses Spring AOP and the circuit breaker will not run.

## OpenAI And Spring AI

Services that do not need LLM model beans should explicitly disable unnecessary
Spring AI auto-configured models in config. LLM-calling services should wire the
required OpenAI sync and async clients explicitly.
