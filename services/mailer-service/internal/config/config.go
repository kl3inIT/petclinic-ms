// Package config — load + validate runtime config từ env vars.
// Tương đương @ConfigurationProperties bên Spring.
package config

import (
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
)

// Config gom mọi cài đặt runtime. Đọc env once lúc startup, không hot-reload.
type Config struct {
	// HTTP server cho health/metrics. Mailer KHÔNG expose business endpoint.
	HTTPPort int `env:"HTTP_PORT" envDefault:"8186"`

	// AMQP
	AMQPURL          string `env:"AMQP_URL" envDefault:"amqp://guest:guest@localhost:5672/"`
	EventsExchange   string `env:"EVENTS_EXCHANGE" envDefault:"petclinic.events"`
	EventsDLX        string `env:"EVENTS_DLX" envDefault:"petclinic.events.dlx"`
	PrefetchCount    int    `env:"AMQP_PREFETCH" envDefault:"10"`
	ConsumerName     string `env:"CONSUMER_NAME" envDefault:"mailer-service"`

	// SMTP — default Mailpit dev
	SMTPHost     string `env:"SMTP_HOST" envDefault:"localhost"`
	SMTPPort     int    `env:"SMTP_PORT" envDefault:"1025"`
	SMTPUser     string `env:"SMTP_USER" envDefault:""`
	SMTPPassword string `env:"SMTP_PASSWORD" envDefault:""`
	MailFrom     string `env:"MAIL_FROM" envDefault:"noreply@petclinic.mss301.local"`
	MailFromName string `env:"MAIL_FROM_NAME" envDefault:"Petclinic MSS301"`

	// Redis (idempotency dedupe)
	RedisAddr        string        `env:"REDIS_ADDR" envDefault:"localhost:6380"`
	RedisPassword    string        `env:"REDIS_PASSWORD" envDefault:""`
	RedisDB          int           `env:"REDIS_DB" envDefault:"0"`
	IdempotencyTTL   time.Duration `env:"IDEMPOTENCY_TTL" envDefault:"168h"` // 7 ngày

	// Templates
	TemplatesDir string `env:"TEMPLATES_DIR" envDefault:"templates"`

	// Public app URL — chèn vào email link
	AppBaseURL string `env:"APP_BASE_URL" envDefault:"http://localhost:3333"`

	// Logging
	LogLevel string `env:"LOG_LEVEL" envDefault:"info"`
}

// Load đọc env vars + apply defaults. Lỗi parse → fail-fast tại main.
func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}
	return cfg, nil
}
