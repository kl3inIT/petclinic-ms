# PCMS Mermaid Package Views

These files are editable Mermaid flowcharts intended for import into Mermaid
Live Editor, diagrams.net, or another Mermaid-compatible editor.

Mermaid does not provide a native UML package element. Therefore:

- `subgraph` represents a package or module boundary;
- rectangular nodes represent leaf packages;
- dotted arrows (`-.->`) represent package dependencies;
- external dependencies are grouped to keep service diagrams readable.

The diagrams intentionally avoid custom styling and layout-only edges so they
remain easy to import and rearrange.

The `rendered/` directory contains PNG previews generated from every `.mmd`
file. The Mermaid source files remain the editable source of truth.

## Files

- `00-system-overview.mmd`
- `01-admin-server.mmd`
- `02-api-gateway.mmd`
- `03-config-server.mmd`
- `04-discovery-server.mmd`
- `05-auth-service.mmd`
- `06-customers-service.mmd`
- `07-vets-service.mmd`
- `08-visits-service.mmd`
- `09-reviews-service.mmd`
- `10-billing-service.mmd`
- `11-products-service.mmd`
- `12-workflow-service.mmd`
- `13-genai-service.mmd`
- `14-mcp-server.mmd`
- `15-files-service.mmd`
- `16-mailer-service.mmd`
