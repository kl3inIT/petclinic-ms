# 0003 - Polyglot Edge Services

Status: accepted

## Context

Not every deployable benefits from being a Spring Boot service. Email delivery
and object storage operations are small I/O-heavy workloads with minimal domain
logic.

## Decision

Implement `mailer-service` and `files-service` in Go 1.26 while keeping the
main domain services in Spring Boot.

## Consequences

Go services are not Gradle modules and do not use Config Server. They own their
own `go.mod`, Dockerfile, environment binding, and local README. Integration
with the broader platform happens through HTTP, RabbitMQ, Redis, MinIO, and
Spring Boot Admin self-registration where appropriate.
