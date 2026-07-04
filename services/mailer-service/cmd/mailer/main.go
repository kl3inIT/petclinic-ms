// Mailer-service entry point.
//
// Wire toàn bộ component, start AMQP consumer + HTTP health endpoint,
// graceful shutdown khi nhận SIGINT/SIGTERM.
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/mss301/petclinic-mailer/internal/config"
	"github.com/mss301/petclinic-mailer/internal/consumer"
	"github.com/mss301/petclinic-mailer/internal/events"
	"github.com/mss301/petclinic-mailer/internal/mailer"
	"github.com/mss301/petclinic-mailer/internal/sba"
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
		makeVisitCompletedHandler(m, idem, cfg.AppBaseURL, cons, log))
	subscribe("mailer.invoice.paid", "invoice.paid", "invoice-paid",
		makeInvoicePaidHandler(m, idem, cfg.AppBaseURL, log))

	// Health HTTP server — k8s/CI ping liveness/readiness.
	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.HTTPPort),
		ReadHeaderTimeout: 5 * time.Second,
	}
	mux := http.NewServeMux()
	healthHandler := func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"UP"}`))
	}
	// `/health` cho k8s liveness; `/actuator/health` cho Spring Boot Admin scrape.
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/actuator/health", healthHandler)
	// `/actuator/info` — SBA hiển thị tab Info. Static metadata, không động.
	mux.HandleFunc("/actuator/info", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"app":{"name":"mailer-service","runtime":"go","language":"go1.26"}}`))
	})
	srv.Handler = mux

	// Self-register tới SBA — background goroutine, không block main.
	// Mailer KHÔNG trên Eureka nên SBA không auto-discover được.
	wg.Add(1)
	go func() {
		defer wg.Done()
		sba.Register(ctx, cfg.AdminServerURL, "mailer-service",
			cfg.AdminPublicHost, cfg.HTTPPort,
			cfg.AdminUser, cfg.AdminPassword, log)
	}()

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

// makeVisitCompletedHandler — gắn thêm saga choreography ack/failed publish.
// Saga: visits-service publish VisitCompleted → mailer gửi mail → publish
//   - visit.notification.ack  nếu OK   → visits-service đánh saga COMPLETED
//   - visit.notification.failed nếu fail → visits-service trigger compensating transaction
//
// cons param dùng để publish back (cùng channel với consume — không cần connection riêng).
func makeVisitCompletedHandler(m *mailer.Mailer, idem *store.Idempotency, appURL string,
	cons *consumer.Consumer, log *slog.Logger) consumer.Handler {
	return func(ctx context.Context, body []byte) error {
		ev, ok, err := claim[events.VisitCompleted](ctx, body, idem, "visit.completed",
			func(e *events.VisitCompleted) string { return e.EventID },
			func(e *events.VisitCompleted) string { return e.CustomerEmail },
			log)
		if err != nil || !ok {
			return err
		}
		sendErr := m.Send(ctx, ev.CustomerEmail,
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
		publishSagaAck(ctx, cons, "visit", strconv.FormatInt(ev.VisitID, 10),
			ev.EventID, ev.CustomerEmail, sendErr, log)
		// Trả nil dù mail fail — saga failed event đã publish, không cần requeue/DLQ
		// (consumer outer dispatch sẽ ack message gốc visit.completed).
		// Nếu trả sendErr → message gốc rớt DLQ + saga failed event cũng publish → double signal.
		return nil
	}
}

func makeInvoicePaidHandler(m *mailer.Mailer, idem *store.Idempotency, appURL string, log *slog.Logger) consumer.Handler {
	return func(ctx context.Context, body []byte) error {
		ev, ok, err := claim[events.InvoicePaid](ctx, body, idem, "invoice.paid",
			func(e *events.InvoicePaid) string { return e.EventID },
			func(e *events.InvoicePaid) string { return e.CustomerEmail },
			log)
		if err != nil || !ok {
			return err
		}
		return m.Send(ctx, ev.CustomerEmail,
			fmt.Sprintf("Biên nhận thanh toán #%d — Petclinic MSS301", ev.InvoiceID),
			"invoice-paid", map[string]any{
				"CustomerName":     ev.CustomerName,
				"InvoiceID":        ev.InvoiceID,
				"Total":            ev.Total,
				"Currency":         ev.Currency,
				"PaymentMethod":    ev.PaymentMethod,
				"PaymentReference": ev.PaymentRef,
				"PaidAtFormatted":  ev.PaidAt.Local().Format(vnTimeLayout),
				"AppBaseURL":       appURL,
			})
	}
}

// publishSagaAck — publish ack/failed event sau khi notifier thử gửi mail xong.
// sendErr nil → notification.ack; not nil → notification.failed với errorMessage.
func publishSagaAck(ctx context.Context, cons *consumer.Consumer,
	domain, entityID, originalEventID, recipient string, sendErr error, log *slog.Logger) {
	now := time.Now().UTC()
	if sendErr == nil {
		ack := events.NotificationAck{
			EventID:         newUUIDv4(),
			EventType:       domain + ".notification.ack",
			OccurredAt:      now,
			Source:          "mailer-service",
			OriginalEventID: originalEventID,
			Domain:          domain,
			EntityID:        entityID,
			Recipient:       recipient,
		}
		if err := cons.Publish(ctx, ack.EventType, ack); err != nil {
			log.Error("publish notification.ack failed", "err", err, "domain", domain, "entityId", entityID)
		}
		return
	}
	failed := events.NotificationFailed{
		EventID:         newUUIDv4(),
		EventType:       domain + ".notification.failed",
		OccurredAt:      now,
		Source:          "mailer-service",
		OriginalEventID: originalEventID,
		Domain:          domain,
		EntityID:        entityID,
		Recipient:       recipient,
		ErrorMessage:    sendErr.Error(),
	}
	if err := cons.Publish(ctx, failed.EventType, failed); err != nil {
		log.Error("publish notification.failed failed", "err", err, "domain", domain, "entityId", entityID)
	}
}

// newUUIDv4 — RFC 4122 v4 UUID dùng crypto/rand. Tránh thêm dep github.com/google/uuid
// chỉ để generate 1 UUID per publish. 16 random bytes + set version (0x40) + variant (0x80).
func newUUIDv4() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// Fallback timestamp-based — không thực sự unique nhưng đủ cho dev khi rand fail.
		return fmt.Sprintf("00000000-0000-4000-8000-%012d", time.Now().UnixNano())
	}
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant RFC 4122
	hex := hex.EncodeToString(b[:])
	return hex[0:8] + "-" + hex[8:12] + "-" + hex[12:16] + "-" + hex[16:20] + "-" + hex[20:32]
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
