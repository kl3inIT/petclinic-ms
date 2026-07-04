package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	HTTPPort int `env:"HTTP_PORT" envDefault:"8193"`

	MinioEndpoint       string `env:"MINIO_ENDPOINT" envDefault:"localhost:9000"`
	MinioPublicEndpoint string `env:"MINIO_PUBLIC_ENDPOINT" envDefault:"localhost:9000"`
	MinioAccessKey      string `env:"MINIO_ACCESS_KEY" envDefault:"minioadmin"`
	MinioSecretKey      string `env:"MINIO_SECRET_KEY" envDefault:"minioadmin"`
	MinioUseSSL         bool   `env:"MINIO_USE_SSL" envDefault:"false"`

	DefaultPresignedTTL time.Duration `env:"DEFAULT_PRESIGNED_TTL" envDefault:"1h"`
	MaxPresignedTTL     time.Duration `env:"MAX_PRESIGNED_TTL" envDefault:"24h"`
	MaxUploadBytes      int64         `env:"MAX_UPLOAD_BYTES" envDefault:"52428800"`
}

func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}
	cfg.MinioEndpoint = normalizeEndpoint(cfg.MinioEndpoint)
	cfg.MinioPublicEndpoint = normalizeEndpoint(cfg.MinioPublicEndpoint)
	if cfg.MinioPublicEndpoint == "" {
		cfg.MinioPublicEndpoint = cfg.MinioEndpoint
	}
	if cfg.MaxPresignedTTL <= 0 {
		cfg.MaxPresignedTTL = 24 * time.Hour
	}
	if cfg.DefaultPresignedTTL <= 0 || cfg.DefaultPresignedTTL > cfg.MaxPresignedTTL {
		cfg.DefaultPresignedTTL = time.Hour
	}
	return cfg, nil
}

func normalizeEndpoint(value string) string {
	value = strings.TrimSpace(value)
	value = strings.TrimPrefix(value, "http://")
	value = strings.TrimPrefix(value, "https://")
	return strings.TrimRight(value, "/")
}
