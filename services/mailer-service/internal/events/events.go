// Package events — local DTO records (Tolerant Reader).
// KHÔNG import từ Java common-events (không thể). Redefine struct theo
// schema JSON đã chốt giữa publisher (auth-service, visits-service) và consumer (mailer).
// Jackson sẽ tự ignore field publisher có nhưng consumer không cần.
package events

import "time"

// UserRegistered — phát ra bởi auth-service sau khi user save thành công.
// Routing key: "user.registered".
type UserRegistered struct {
	EventID    string    `json:"eventId"`    // UUID — idempotency key
	EventType  string    `json:"eventType"`  // "user.registered"
	OccurredAt time.Time `json:"occurredAt"` // ISO-8601
	Source     string    `json:"source"`     // "auth-service"

	UserID   string `json:"userId"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// VisitScheduled — phát ra bởi visits-service sau khi book lịch.
// Routing key: "visit.scheduled". Payload đã denormalized — không cần callback.
type VisitScheduled struct {
	EventID    string    `json:"eventId"`
	EventType  string    `json:"eventType"`
	OccurredAt time.Time `json:"occurredAt"`
	Source     string    `json:"source"`

	VisitID     int64     `json:"visitId"`
	ScheduledAt time.Time `json:"scheduledAt"`
	Reason      string    `json:"reason"`

	CustomerUserID   string `json:"customerUserId"`
	CustomerUsername string `json:"customerUsername"`
	CustomerEmail    string `json:"customerEmail"`

	PetID   int64  `json:"petId"`
	PetName string `json:"petName"`

	VetID   int64  `json:"vetId"`
	VetName string `json:"vetName"`
}

// VisitCompleted — phát ra bởi visits-service sau khi vet hoàn thành.
// Routing key: "visit.completed".
type VisitCompleted struct {
	EventID    string    `json:"eventId"`
	EventType  string    `json:"eventType"`
	OccurredAt time.Time `json:"occurredAt"`
	Source     string    `json:"source"`

	VisitID     int64     `json:"visitId"`
	ScheduledAt time.Time `json:"scheduledAt"`
	CompletedAt time.Time `json:"completedAt"`

	CustomerUserID   string `json:"customerUserId"`
	CustomerUsername string `json:"customerUsername"`
	CustomerEmail    string `json:"customerEmail"`

	PetID   int64  `json:"petId"`
	PetName string `json:"petName"`

	VetID   int64  `json:"vetId"`
	VetName string `json:"vetName"`

	Diagnosis string `json:"diagnosis"`
	Treatment string `json:"treatment"`
	// Fee: BigDecimal bên Java → JSON string. Dùng string để giữ precision.
	Fee string `json:"fee"`
}

// InvoicePaid — phát ra bởi billing-service sau khi checkout hoá đơn thành công.
// Routing key: "invoice.paid".
type InvoicePaid struct {
	EventID    string    `json:"eventId"`
	EventType  string    `json:"eventType"`
	OccurredAt time.Time `json:"occurredAt"`
	Source     string    `json:"source"`

	InvoiceID      int64     `json:"invoiceId"`
	CustomerUserID string    `json:"customerUserId"`
	CustomerName   string    `json:"customerName"`
	CustomerEmail  string    `json:"customerEmail"`
	Total          string    `json:"total"`
	Currency       string    `json:"currency"`
	PaymentMethod  string    `json:"paymentMethod"`
	PaymentRef     string    `json:"paymentReference"`
	PaidAt         time.Time `json:"paidAt"`
}

// NotificationAck — generic envelope phát ra khi notification gửi THÀNH CÔNG.
// Routing key convention: "<domain>.notification.ack" (vd "visit.notification.ack").
// Match Java common-events.saga.NotificationAck record — Tolerant Reader cross-language.
//
// originalEventId = UUID event gốc đã trigger saga (vd VisitCompleted.EventID).
// Service initiator (visits-service) lookup NotificationSaga row qua field này → idempotent apply.
type NotificationAck struct {
	EventID         string    `json:"eventId"`
	EventType       string    `json:"eventType"`
	OccurredAt      time.Time `json:"occurredAt"`
	Source          string    `json:"source"`
	OriginalEventID string    `json:"originalEventId"`
	Domain          string    `json:"domain"`   // "visit" | "user" | ...
	EntityID        string    `json:"entityId"` // domain entity ID (string để cross-language safe)
	Recipient       string    `json:"recipient"`
}

// NotificationFailed — generic envelope khi notification fail vĩnh viễn.
// Routing: "<domain>.notification.failed". Trigger compensating transaction tại initiator.
type NotificationFailed struct {
	EventID         string    `json:"eventId"`
	EventType       string    `json:"eventType"`
	OccurredAt      time.Time `json:"occurredAt"`
	Source          string    `json:"source"`
	OriginalEventID string    `json:"originalEventId"`
	Domain          string    `json:"domain"`
	EntityID        string    `json:"entityId"`
	Recipient       string    `json:"recipient"`
	ErrorMessage    string    `json:"errorMessage"`
}
