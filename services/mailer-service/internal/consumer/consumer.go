// Package consumer — AMQP consumer wrapper.
//
// Mirror y hệt topology mà shared/common-events Java helper declare:
//   - Topic exchange `petclinic.events`
//   - DLX `petclinic.events.dlx`
//   - Per-service per-event queue: `mailer.<routingKey>` (vd `mailer.user.registered`)
//   - DLQ: `mailer.<routingKey>.dlq`
//   - Main queue có args x-dead-letter-exchange + x-dead-letter-routing-key
//
// Bằng tay vì amqp091-go không có helper cao cấp như Spring AMQP Declarables.
package consumer

import (
	"context"
	"fmt"
	"log/slog"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Handler — caller cung cấp logic xử lý 1 message. Trả lỗi = nack (DLQ).
// Trả nil = ack.
type Handler func(ctx context.Context, body []byte) error

// Consumer giữ connection + channel.
type Consumer struct {
	conn     *amqp.Connection
	ch       *amqp.Channel
	exchange string
	dlx      string
	log      *slog.Logger
}

func Dial(url, exchange, dlx string, prefetch int, log *slog.Logger) (*Consumer, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("dial amqp: %w", err)
	}
	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("open channel: %w", err)
	}
	if err := ch.Qos(prefetch, 0, false); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("set qos: %w", err)
	}

	// Declare exchanges idempotent — match common-events autoconfig bên Java.
	for _, ex := range []string{exchange, dlx} {
		if err := ch.ExchangeDeclare(ex, "topic", true, false, false, false, nil); err != nil {
			_ = ch.Close()
			_ = conn.Close()
			return nil, fmt.Errorf("declare exchange %s: %w", ex, err)
		}
	}

	return &Consumer{conn: conn, ch: ch, exchange: exchange, dlx: dlx, log: log}, nil
}

// Subscribe declare queue + DLQ + bindings, sau đó stream message → handler.
// Block đến khi ctx Done hoặc channel closed.
func (c *Consumer) Subscribe(ctx context.Context, queueName, routingKey, consumerTag string, handler Handler) error {
	dlqName := queueName + ".dlq"

	// Main queue — đẩy reject vào DLX với cùng routing key.
	mainArgs := amqp.Table{
		"x-dead-letter-exchange":    c.dlx,
		"x-dead-letter-routing-key": routingKey,
	}
	if _, err := c.ch.QueueDeclare(queueName, true, false, false, false, mainArgs); err != nil {
		return fmt.Errorf("declare queue %s: %w", queueName, err)
	}
	if _, err := c.ch.QueueDeclare(dlqName, true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare DLQ %s: %w", dlqName, err)
	}
	if err := c.ch.QueueBind(queueName, routingKey, c.exchange, false, nil); err != nil {
		return fmt.Errorf("bind %s -> %s: %w", queueName, c.exchange, err)
	}
	if err := c.ch.QueueBind(dlqName, routingKey, c.dlx, false, nil); err != nil {
		return fmt.Errorf("bind %s -> %s (DLQ): %w", dlqName, c.dlx, err)
	}

	deliveries, err := c.ch.Consume(queueName, consumerTag, false /*autoAck*/, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("start consume %s: %w", queueName, err)
	}

	c.log.Info("subscribed", "queue", queueName, "routingKey", routingKey)

	for {
		select {
		case <-ctx.Done():
			c.log.Info("stopping consumer", "queue", queueName, "reason", ctx.Err())
			return nil
		case d, ok := <-deliveries:
			if !ok {
				return fmt.Errorf("channel closed for %s", queueName)
			}
			c.dispatch(ctx, d, handler)
		}
	}
}

// dispatch — gọi handler, ack/nack theo kết quả.
// Nack với requeue=false → message rớt vào DLQ qua x-dead-letter-exchange.
func (c *Consumer) dispatch(ctx context.Context, d amqp.Delivery, handler Handler) {
	if err := handler(ctx, d.Body); err != nil {
		c.log.Error("handler failed -> DLQ", "err", err, "routingKey", d.RoutingKey)
		_ = d.Nack(false, false)
		return
	}
	if err := d.Ack(false); err != nil {
		c.log.Error("ack failed", "err", err)
	}
}

func (c *Consumer) Close() {
	if c.ch != nil {
		_ = c.ch.Close()
	}
	if c.conn != nil {
		_ = c.conn.Close()
	}
}
