// Package events — local DTO records (Tolerant Reader).
// KHÔNG import từ Java common-events (không thể). Redefine struct theo
// schema JSON đã chốt giữa publisher (auth-service) và consumer (mailer).
// Jackson sẽ tự ignore field publisher có nhưng consumer không cần.
package events

import "time"

// UserRegistered — phát ra bởi auth-service sau khi user save thành công.
// Routing key: "user.registered".
type UserRegistered struct {
	EventID    string    `json:"eventId"`    // UUID — idempotency key
	EventType  string    `json:"eventType"`  // luôn = "user.registered"
	OccurredAt time.Time `json:"occurredAt"` // ISO-8601
	Source     string    `json:"source"`     // "auth-service"

	UserID   string `json:"userId"`
	Username string `json:"username"`
	Email    string `json:"email"`
}
