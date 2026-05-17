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
