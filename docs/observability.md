# Observability — petclinic-ms

Three pillars in dev:

| Pillar  | Stack                                | UI                          |
| ------- | ------------------------------------ | --------------------------- |
| Logs    | console (Logback) + Spring Boot Admin| http://localhost:8185       |
| Traces  | OpenTelemetry → Zipkin (with OTLP collector) | http://localhost:9411 |
| Metrics | Micrometer → Prometheus → Grafana    | http://localhost:3000 (admin/admin) |

All three are gated behind the `obs` Compose profile (or `all`).

## Bring up

```bash
docker compose --profile obs up -d                       # observability only
docker compose --profile all --profile apps up -d --build # full stack
```

Then:

- Prometheus targets: <http://localhost:9090/targets> — every service listed should be **UP** within 30s of app start.
- Grafana: <http://localhost:3000> → folder `PetClinic` → dashboard `PetClinic Overview` (auto-provisioned).
- Zipkin: <http://localhost:9411> → service-name selector picks any Spring service.

## How it works

### Metrics path

1. Every Spring service inherits `petclinic.spring-boot-service` convention plugin
   → `spring-boot-starter-actuator` + `micrometer-registry-prometheus` on classpath.
2. `config-repo/application.yml` exposes `prometheus` endpoint + tags every meter with
   `application=${spring.application.name}` — base for Grafana variable filtering.
3. Prometheus scrapes `http://<service>:<mgmt-port>/actuator/prometheus` every 15s
   (`infra/observability/prometheus/prometheus.yml`).
4. Grafana datasource (`Prometheus`) + dashboard provider (`PetClinic`) auto-load from
   `infra/observability/grafana/provisioning/`.

### Adding a new service

1. Apply `petclinic.spring-boot-service` convention plugin → registry auto-added.
2. Append a target to `infra/observability/prometheus/prometheus.yml`:
   ```yaml
   - targets: ['my-new-service:9xxx']
     labels: { service: my-new-service }
   ```
3. Reload Prometheus without restart:
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```

### Adding a new dashboard

Drop a JSON file into `infra/observability/grafana/dashboards/`. The file provider
re-scans every 30s — no restart needed. Export from Grafana UI (Dashboard → Settings →
JSON Model) and check in.

## Default dashboard panels

`PetClinic Overview` covers:

- **Up / Uptime** — service health quick check.
- **JVM heap used** — per-service heap pressure.
- **CPU usage** — process CPU normalized 0-1.
- **Live threads** — including virtual threads (Java 25 + Boot 4).
- **GC pause rate** — `jvm_gc_pause_seconds_sum` rate.
- **Log events by level** — `logback_events_total` (catch sudden ERROR spikes).
- **HTTP request rate by status** — 2xx/4xx/5xx breakdown.
- **HTTP p95 latency by URI** — slow endpoint detection.
- **HikariCP active connections** — DB pool saturation.
- **Tomcat threads** — busy vs total (drift away as virtual threads land).

## Production guidance (out of scope for dev, noted for completeness)

- Replace in-memory Zipkin with persistent backend (Tempo, Jaeger with Elastic).
- Replace Prometheus single instance with Prometheus + Thanos / Mimir for HA + long retention.
- Tighten `/actuator/*` exposure: only `health, info, prometheus` over public, others gated by
  basic-auth + IP allow.
- Add alerting rules (`prometheus.rules.yml`) — high error rate, p95 latency SLO, JVM heap pressure.
