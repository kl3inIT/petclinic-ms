# mailer-service (Go)

Async email worker. Consumer-only: subscribe `petclinic.events` exchange,
render template, gửi SMTP. KHÔNG expose REST API business (chỉ `/health`).

## Tại sao Go (không phải Spring)

| | Spring | Go |
|---|---|---|
| RAM idle | ~250-300 MB | ~25 MB |
| Cold start | 8-15s | ~50ms |
| Image Docker | ~250 MB | ~25 MB |
| Code chính | ~300 dòng + 5 config | ~600 dòng, không config |

Mailer = pure I/O (RMQ in, SMTP out). Không JPA, không OAuth, không cross-service
HTTP call. Spring overkill cho workload này.

## Cấu trúc

```
mailer-service/
├── cmd/mailer/main.go        ← entry point, wire dependency + lifecycle
├── internal/
│   ├── config/               ← env-binding (caarlos0/env)
│   ├── consumer/             ← AMQP consumer + DLQ topology
│   ├── events/               ← DTO records (Tolerant Reader pattern)
│   ├── mailer/               ← SMTP sender + html/template
│   └── store/                ← Redis idempotency dedupe
├── templates/                ← *.html email templates
├── go.mod                    ← deps
└── Dockerfile                ← multi-stage build → distroless ~25MB
```

## Run native (dev)

```powershell
# Pre-req: docker compose --profile mq --profile cache --profile mail up -d
cd services\mailer-service
go run ./cmd/mailer
```

Mặc định:
- AMQP: `amqp://guest:guest@localhost:5672/`
- Redis: `localhost:6380`
- SMTP: `localhost:1025` (Mailpit)
- Templates: `templates/*.html`
- HTTP health: `http://localhost:8186/health`

## Run Docker

```powershell
cd services\mailer-service
docker build -t mss301/mailer-service:dev .
docker run --rm --network host -e AMQP_URL=amqp://guest:guest@localhost:5672/ mss301/mailer-service:dev
```

## Env vars

Tất cả có default, override bằng env:

| Var | Default | Mục đích |
|---|---|---|
| `HTTP_PORT` | `8186` | Liveness/readiness |
| `AMQP_URL` | `amqp://guest:guest@localhost:5672/` | RabbitMQ |
| `EVENTS_EXCHANGE` | `petclinic.events` | Topic exchange chính |
| `EVENTS_DLX` | `petclinic.events.dlx` | Dead-letter exchange |
| `AMQP_PREFETCH` | `10` | Concurrency limit per consumer |
| `SMTP_HOST` | `localhost` | Mailpit dev / prod SMTP |
| `SMTP_PORT` | `1025` | |
| `SMTP_USER` / `SMTP_PASSWORD` | empty | Bỏ trống = no auth (Mailpit) |
| `MAIL_FROM` | `noreply@petclinic.mss301.local` | |
| `MAIL_FROM_NAME` | `Petclinic MSS301` | |
| `REDIS_ADDR` | `localhost:6380` | Idempotency store |
| `IDEMPOTENCY_TTL` | `168h` | Dedupe window (7 ngày) |
| `APP_BASE_URL` | `http://localhost:3333` | Chèn vào email link |
| `LOG_LEVEL` | `info` | `debug`/`info`/`warn`/`error` |

## Event handled

| Routing key | Queue | Action |
|---|---|---|
| `user.registered` | `mailer.user.registered` | Gửi welcome mail |

Thêm event mới = thêm 1 closure handler trong `main.go` + 1 dòng `cons.Subscribe(...)`.

## Idempotency

- Mỗi event có `eventId` (UUID) từ publisher
- Trước khi gửi: `Redis SETNX mailer:processed:<eventId>` với TTL 7 ngày
- Nếu key đã tồn tại → skip (đã gửi rồi), ack message
- Nếu chưa → mark + send

Crash giữa SETNX và Send → eventId đã claim nhưng mail chưa gửi.
Cho welcome mail, đây là trade-off chấp nhận được (mất 1 mail vs gửi double).
Production muốn exactly-once: dùng outbox pattern + reconciliation job.

## DLQ pattern

- Main queue `mailer.user.registered` có args:
  - `x-dead-letter-exchange = petclinic.events.dlx`
  - `x-dead-letter-routing-key = user.registered`
- DLQ `mailer.user.registered.dlq` bind vào DLX
- Handler trả error → `Nack(requeue=false)` → message rớt DLQ
- Inspect DLQ: http://localhost:15672 → Queues → `.dlq`

## Build & test

```powershell
go build ./...        # compile check
go test ./...         # unit test
go mod tidy           # clean deps
```
