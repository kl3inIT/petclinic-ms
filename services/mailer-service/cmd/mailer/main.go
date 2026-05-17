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

// Format thời gian kiểu Việt Nam — hiển thị trong template HTML.
const vnTimeLayout = "15:04 - 02/01/2006"

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

	var wg sync.WaitGroup
	subscribe := func(queue, routingKey, tagSuffix string, h consumer.Handler) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			err := cons.Subscribe(ctx, queue, routingKey, cfg.ConsumerName+"-"+tagSuffix, h)
			if err != nil && !errors.Is(err, context.Canceled) {
				log.Error("subscriber stopped", "queue", queue, "err", err)
				cancel()
			}
		}()
	}

	subscribe("mailer.user.registered", "user.registered", "user-registered",
		makeUserRegisteredHandler(m, idem, cfg.AppBaseURL, log))
	subscribe("mailer.visit.scheduled", "visit.scheduled", "visit-scheduled",
		makeVisitScheduledHandler(m, idem, cfg.AppBaseURL, log))
	subscribe("mailer.visit.completed", "visit.completed", "visit-completed",
		makeVisitCompletedHandler(m, idem, cfg.AppBaseURL, log))

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

// claim — common boilerplate: unmarshal + idempotency check.
// Trả về (eventID, ok=true) nếu cần gửi mail; ok=false nếu skip (đã thấy hoặc invalid).
func claim[T any](ctx context.Context, body []byte, idem *store.Idempotency, eventTypeName string,
	getID func(*T) string, getRequired func(*T) string,
	log *slog.Logger) (*T, bool, error) {
	var ev T
	if err := json.Unmarshal(body, &ev); err != nil {
		return nil, false, fmt.Errorf("unmarshal %s: %w", eventTypeName, err)
	}
	id := getID(&ev)
	if id == "" {
		return nil, false, fmt.Errorf("invalid %s: missing eventId", eventTypeName)
	}
	if required := getRequired(&ev); required == "" {
		return nil, false, fmt.Errorf("invalid %s: missing required field", eventTypeName)
	}
	fresh, err := idem.Claim(ctx, id)
	if err != nil {
		return nil, false, fmt.Errorf("idempotency claim: %w", err)
	}
	if !fresh {
		log.Info("event already processed, skipping", "eventId", id, "type", eventTypeName)
		return nil, false, nil
	}
	return &ev, true, nil
}

func makeUserRegisteredHandler(m *mailer.Mailer, idem *store.Idempotency, appURL string, log *slog.Logger) consumer.Handler {
	return func(ctx context.Context, body []byte) error {
		ev, ok, err := claim[events.UserRegistered](ctx, body, idem, "user.registered",
			func(e *events.UserRegistered) string { return e.EventID },
			func(e *events.UserRegistered) string { return e.Email },
			log)
		if err != nil || !ok {
			return err
		}
		return m.Send(ctx, ev.Email, "Chào mừng đến Petclinic MSS301!", "welcome", map[string]any{
			"Username":   ev.Username,
			"AppBaseURL": appURL,
		})
	}
}

func makeVisitScheduledHandler(m *mailer.Mailer, idem *store.Idempotency, appURL string, log *slog.Logger) consumer.Handler {
	return func(ctx context.Context, body []byte) error {
		ev, ok, err := claim[events.VisitScheduled](ctx, body, idem, "visit.scheduled",
			func(e *events.VisitScheduled) string { return e.EventID },
			func(e *events.VisitScheduled) string { return e.CustomerEmail },
			log)
		if err != nil || !ok {
			return err
		}
		return m.Send(ctx, ev.CustomerEmail,
			fmt.Sprintf("Xác nhận lịch khám cho %s — Petclinic MSS301", ev.PetName),
			"visit-reminder", map[string]any{
				"CustomerUsername":     ev.CustomerUsername,
				"VisitID":              ev.VisitID,
				"PetName":              ev.PetName,
				"VetName":              ev.VetName,
				"ScheduledAtFormatted": ev.ScheduledAt.Local().Format(vnTimeLayout),
				"Reason":               ev.Reason,
				"AppBaseURL":           appURL,
			})
	}
}

func makeVisitCompletedHandler(m *mailer.Mailer, idem *store.Idempotency, appURL string, log *slog.Logger) consumer.Handler {
	return func(ctx context.Context, body []byte) error {
		ev, ok, err := claim[events.VisitCompleted](ctx, body, idem, "visit.completed",
			func(e *events.VisitCompleted) string { return e.EventID },
			func(e *events.VisitCompleted) string { return e.CustomerEmail },
			log)
		if err != nil || !ok {
			return err
		}
		return m.Send(ctx, ev.CustomerEmail,
			fmt.Sprintf("Tóm tắt buổi khám của %s — Petclinic MSS301", ev.PetName),
			"visit-completed", map[string]any{
				"CustomerUsername":     ev.CustomerUsername,
				"VisitID":              ev.VisitID,
				"PetName":              ev.PetName,
				"VetName":              ev.VetName,
				"ScheduledAtFormatted": ev.ScheduledAt.Local().Format(vnTimeLayout),
				"CompletedAtFormatted": ev.CompletedAt.Local().Format(vnTimeLayout),
				"Diagnosis":            ev.Diagnosis,
				"Treatment":            ev.Treatment,
				"Fee":                  ev.Fee,
				"AppBaseURL":           appURL,
			})
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
