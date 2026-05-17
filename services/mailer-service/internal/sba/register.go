// Package sba — self-register tới Spring Boot Admin Server.
//
// SBA bình thường discover service qua Eureka, mailer là Go nên không cài Eureka client.
// Workaround: POST /instances tới SBA lúc startup. SBA sẽ poll /actuator/health của mailer
// (sweet spot: chỉ cần fake response Spring-shape).
//
// Loop re-register mỗi 30s phòng SBA restart, instance bị evict.
package sba

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// Instance — payload tối thiểu mà SBA cần để hiển thị 1 service trong dashboard.
// Field name match SBA Java DTO de.codecentric.boot.admin.server.domain.values.Registration.
type Instance struct {
	Name           string            `json:"name"`
	HealthURL      string            `json:"healthUrl"`
	ManagementURL  string            `json:"managementUrl"`
	ServiceURL     string            `json:"serviceUrl"`
	Metadata       map[string]string `json:"metadata,omitempty"`
}

// Register POST tới SBA /instances. Lặp với backoff ngắn để chịu được SBA chậm startup.
// Background goroutine — không block main, không crash nếu SBA chưa lên.
func Register(ctx context.Context, sbaURL, name, publicHost string, port int, log *slog.Logger) {
	if sbaURL == "" {
		log.Info("sba self-register disabled (ADMIN_SERVER_URL empty)")
		return
	}
	base := fmt.Sprintf("http://%s:%d", publicHost, port)
	inst := Instance{
		Name:          name,
		HealthURL:     base + "/actuator/health",
		ManagementURL: base + "/actuator",
		ServiceURL:    base + "/",
		Metadata: map[string]string{
			"runtime":  "go",
			"polyglot": "true",
		},
	}
	body, _ := json.Marshal(inst)
	endpoint := sbaURL + "/instances"

	client := &http.Client{Timeout: 5 * time.Second}
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Lần đầu chạy ngay; sau đó re-register mỗi 30s (heartbeat-style).
	post := func() {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
		if err != nil {
			log.Warn("sba register: build request failed", "err", err)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(req)
		if err != nil {
			log.Debug("sba register: post failed", "endpoint", endpoint, "err", err)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			log.Debug("sba register: ok", "status", resp.StatusCode)
		} else {
			log.Debug("sba register: non-2xx", "status", resp.StatusCode)
		}
	}

	post()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			post()
		}
	}
}
