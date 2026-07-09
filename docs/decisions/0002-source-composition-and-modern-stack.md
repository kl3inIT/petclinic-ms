# 0002 - Source Composition And Modern Stack

Status: accepted

## Context

The project needs enough domain breadth for MSS301 while still demonstrating
modern microservice infrastructure and tooling.

## Decision

Combine three sources:

- Spring official PetClinic microservices for infrastructure patterns.
- Champlain PetClinic for business domain breadth.
- This repository's current conventions for versions, persistence, build
  structure, error handling, generated clients, and deployment assets.

When patterns conflict, infrastructure follows the Spring official reference,
domain shape follows Champlain, and versions/style follow this repository.

## Consequences

The code should not copy Champlain's old build style or MongoDB defaults.
Spring/Gradle dependency versions must remain centralized, and PostgreSQL plus
Liquibase remains the default persistence model for new JVM services.
