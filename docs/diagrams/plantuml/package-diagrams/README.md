# PCMS Package Diagrams

This directory contains one UML package diagram for each independently
deployable service, plus a system-level package overview.

The diagrams follow these rules:

- Every service boundary is a UML package with a technology stereotype.
- Nested elements represent packages that exist in the current source tree.
- Dashed arrows are UML package dependencies.
- Remote service dependencies target an API contract package; they never point
  directly to another service's model or repository package.
- Infrastructure products such as PostgreSQL, RabbitMQ, Redis, and MinIO are
  not modeled as packages.

## Diagram Index

- `00-system-overview.puml`
- `01-admin-server.puml`
- `02-api-gateway.puml`
- `03-config-server.puml`
- `04-discovery-server.puml`
- `05-auth-service.puml`
- `06-customers-service.puml`
- `07-vets-service.puml`
- `08-visits-service.puml`
- `09-reviews-service.puml`
- `10-billing-service.puml`
- `11-products-service.puml`
- `12-workflow-service.puml`
- `13-genai-service.puml`
- `14-mcp-server.puml`
- `15-files-service.puml`
- `16-mailer-service.puml`

All files are self-contained and use native PlantUML `package` elements and
UML dependency arrows. Rendered PNG files are stored under `rendered/`.

Example local render command:

```bash
java -jar plantuml.jar -Playout=smetana -tpng -o rendered \
  docs/diagrams/plantuml/package-diagrams
```

Do not import these files through the current Astah MCP
`convertPlantUMLToAstah` operation. That operation creates a use-case diagram
instead of native package elements for this PlantUML syntax.
