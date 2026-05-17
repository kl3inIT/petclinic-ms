// Mailer-service entry point.
//
// Wire toàn bộ component, start AMQP consumer + HTTP health endpoint,
// graceful shutdown khi nhận SIGINT/SIGTERM.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/mss301/petclinic-mailer/internal/config"
	"github.com/mss301/petclinic-mailer/internal/consumer"
	"github.com/mss301/petclinic-mailer/internal/events"
	"github.com/mss301/petclinic-mailer/internal/mailer"
	"github.com/mss301/petclinic-mailer/internal/store"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	log := newLogger(cfg.LogLevel)
	log.Info("starting mailer-service", "httpPort", cfg.HTTPPort)

	idem, err := store.NewIdempotency(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB, cfg.IdempotencyTTL)
	if err != nil {
		return fmt.Errorf("idempotency store: %w", err)
	}
	defer idem.Close()
	log.Info("redis connected", "addr", cfg.RedisAddr)

	m, err := mailer.New(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword,
		cfg.MailFrom, cfg.MailFromName, cfg.TemplatesDir, log)
	if err != nil {
		return fmt.Errorf("mailer: %w", err)
	}
	defer m.Close()

	cons, err := consumer.Dial(cfg.AMQPURL, cfg.EventsExchange, cfg.EventsDLX, cfg.PrefetchCount, log)
	if err != nil {
		return fmt.Errorf("amqp dial: %w", err)
	}
	defer cons.Close()
	log.Info("amqp connected", "url", cfg.AMQPURL, "exchange", cfg.EventsExchange)

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// Bind handler đóng over (m, idem, log, cfg) → 1 closure handler per event type.
	handlerUserRegistered := makeUserRegisteredHandler(m, idem, cfg.AppBaseURL, log)

	var wg sync.WaitGroup

	// Subscribe user.registered
	wg.Add(1)
	go func() {
		defer wg.Done()
		err := cons.Subscribe(ctx, "mailer.user.registered", "user.registered", cfg.ConsumerName+"-user-registered", handlerUserRegistered)
		if err != nil && !errors.Is(err, context.Canceled) {
			log.Error("subscriber stopped", "err", err)
			cancel()
		}
	}()

	// Health HTTP server — k8s/CI ping liveness/readiness.
	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.HTTPPort),
		ReadHeaderTimeout: 5 * time.Second,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"UP"}`))
	})
	srv.Handler = mux

	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Info("http listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("http server failed", "err", err)
			cancel()
		}
	}()

	<-ctx.Done()
	log.Info("shutdown requested")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)

	wg.Wait()
	log.Info("shutdown complete")
	return nil
}

func makeUserRegisteredHandler(m *mailer.Mailer, idem *store.Idempotency, appURL string, log *slog.Logger) consumer.Handler {
	return func(ctx context.Context, body []byte) error {
		var ev events.UserRegistered
		if err := json.Unmarshal(body, &ev); err != nil {
			// Bad payload → đẩy DLQ, không retry.
			return fmt.Errorf("unmarshal user.registered: %w", err)
		}
		if ev.EventID == "" || ev.Email == "" {
			return fmt.Errorf("invalid event: missing eventId or email")
		}

		fresh, err := idem.Claim(ctx, ev.EventID)
		if err != nil {
			return fmt.Errorf("idempotency claim: %w", err)
		}
		if !fresh {
			log.Info("event already processed, skipping", "eventId", ev.EventID)
			return nil
		}

		data := map[string]any{
			"Username":   ev.Username,
			"AppBaseURL": appURL,
		}
		return m.Send(ctx, ev.Email, "Chào mừng đến Petclinic MSS301!", "welcome", data)
	}
}

func newLogger(level string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl}))
}
