package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/mss301/petclinic-files/internal/config"
	"github.com/mss301/petclinic-files/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	srv, err := server.New(server.Config{
		Endpoint:            cfg.MinioEndpoint,
		PublicEndpoint:      cfg.MinioPublicEndpoint,
		AccessKey:           cfg.MinioAccessKey,
		SecretKey:           cfg.MinioSecretKey,
		UseSSL:              cfg.MinioUseSSL,
		DefaultPresignedTTL: cfg.DefaultPresignedTTL,
		MaxPresignedTTL:     cfg.MaxPresignedTTL,
		MaxUploadBytes:      cfg.MaxUploadBytes,
	})
	if err != nil {
		log.Fatalf("create server: %v", err)
	}
	addr := fmt.Sprintf(":%d", cfg.HTTPPort)
	log.Printf("files-service listening on %s, minio=%s public=%s", addr, cfg.MinioEndpoint, cfg.MinioPublicEndpoint)
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatalf("http server failed: %v", err)
	}
}
