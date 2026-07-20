# petclinic-ms

Learning microservices project for MSS301.

Use [AGENTS.md](AGENTS.md) or [CLAUDE.md](CLAUDE.md) as the documentation map.
Current built architecture is in [ARCHITECTURE.md](ARCHITECTURE.md). Course
deliverables live under [docs/](docs/).

## Common Commands

```bash
docker compose --profile all up -d
./gradlew build
pnpm --filter @petclinic/web typecheck
```