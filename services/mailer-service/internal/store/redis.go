// Package store — idempotency dedupe qua Redis SET với TTL.
//
// Pattern: trước khi gửi mail, kiểm tra eventId đã thấy chưa. Nếu rồi → skip.
// Nếu chưa → mark + send. Crash giữa chừng = ở lần redeliver tiếp eventId chưa
// có trong Redis → vẫn gửi (at-least-once). Đối với welcome mail, gửi 2 lần
// không nguy hiểm — đủ cho dev.
//
// Production cứng hơn: dùng SET NX EX, kiểm tra return value để
// đảm bảo exactly-once. Hiện tại đơn giản hoá để khoá code mailer < 200 LOC.
package store

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Idempotency check + mark eventId.
type Idempotency struct {
	client *redis.Client
	ttl    time.Duration
}

func NewIdempotency(addr, password string, db int, ttl time.Duration) (*Idempotency, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping redis %s: %w", addr, err)
	}
	return &Idempotency{client: client, ttl: ttl}, nil
}

// Claim trả về true nếu eventId chưa thấy (caller được phép xử lý).
// false nếu đã thấy → caller nên skip + ack message.
func (i *Idempotency) Claim(ctx context.Context, eventID string) (bool, error) {
	key := "mailer:processed:" + eventID
	ok, err := i.client.SetNX(ctx, key, "1", i.ttl).Result()
	if err != nil {
		return false, fmt.Errorf("setnx %s: %w", key, err)
	}
	return ok, nil
}

func (i *Idempotency) Close() error { return i.client.Close() }
