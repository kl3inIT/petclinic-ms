# Multi-stage build — golang:alpine biên dịch, distroless run.
# Final image ~25 MB. So với JVM Spring Boot ~250-300 MB, tiết kiệm 10x.

# --- Stage 1: build ---
FROM golang:1.26-alpine AS build

WORKDIR /src

# Cache dependency layer riêng — đổi code không re-download deps.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Static binary — không cần libc, chạy được trên distroless static.
# -trimpath + -ldflags="-s -w" giảm size + ẩn đường dẫn build.
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/mailer \
    ./cmd/mailer

# --- Stage 2: runtime ---
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY --from=build /out/mailer /app/mailer
COPY templates /app/templates

# Port http health (mailer KHÔNG expose REST business). Default 8186.
EXPOSE 8186

USER nonroot:nonroot
ENTRYPOINT ["/app/mailer"]
