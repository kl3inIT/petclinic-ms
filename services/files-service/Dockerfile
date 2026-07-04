FROM golang:1.26-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/files \
    ./cmd/files

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY --from=build /out/files /app/files

EXPOSE 8193

USER nonroot:nonroot
ENTRYPOINT ["/app/files"]
