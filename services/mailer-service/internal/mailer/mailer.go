// Package mailer — SMTP sender + template engine.
//
// Dùng wneessen/go-mail (modern, type-safe, hỗ trợ DKIM/OAuth khi cần
// chuyển sang prod SMTP). Template render bằng stdlib html/template.
package mailer

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"log/slog"
	"path/filepath"

	"github.com/wneessen/go-mail"
)

// Mailer — bọc gomail.Client + cache template đã parse.
type Mailer struct {
	client    *mail.Client
	from      string
	fromName  string
	templates *template.Template
	log       *slog.Logger
}

// New khởi tạo gomail client + parse tất cả .html trong templatesDir.
func New(host string, port int, user, password, from, fromName, templatesDir string, log *slog.Logger) (*Mailer, error) {
	opts := []mail.Option{
		mail.WithPort(port),
		mail.WithTLSPolicy(mail.NoTLS), // Mailpit không TLS — prod đổi sang TLSMandatory
	}
	if user != "" {
		opts = append(opts,
			mail.WithSMTPAuth(mail.SMTPAuthLogin),
			mail.WithUsername(user),
			mail.WithPassword(password),
		)
	}
	client, err := mail.NewClient(host, opts...)
	if err != nil {
		return nil, fmt.Errorf("init smtp client: %w", err)
	}

	pattern := filepath.Join(templatesDir, "*.html")
	tpls, err := template.ParseGlob(pattern)
	if err != nil {
		return nil, fmt.Errorf("parse templates %s: %w", pattern, err)
	}
	log.Info("templates loaded", "count", len(tpls.Templates()), "dir", templatesDir)

	return &Mailer{client: client, from: from, fromName: fromName, templates: tpls, log: log}, nil
}

// Send render template + gửi mail HTML.
// templateName = filename without ext (vd "welcome").
func (m *Mailer) Send(ctx context.Context, to, subject, templateName string, data any) error {
	var body bytes.Buffer
	tpl := m.templates.Lookup(templateName + ".html")
	if tpl == nil {
		return fmt.Errorf("template not found: %s", templateName)
	}
	if err := tpl.Execute(&body, data); err != nil {
		return fmt.Errorf("execute template %s: %w", templateName, err)
	}

	msg := mail.NewMsg()
	if err := msg.FromFormat(m.fromName, m.from); err != nil {
		return fmt.Errorf("set from: %w", err)
	}
	if err := msg.To(to); err != nil {
		return fmt.Errorf("set to %s: %w", to, err)
	}
	msg.Subject(subject)
	msg.SetBodyString(mail.TypeTextHTML, body.String())

	if err := m.client.DialAndSendWithContext(ctx, msg); err != nil {
		return fmt.Errorf("smtp send to %s: %w", to, err)
	}
	m.log.Info("mail sent", "to", to, "template", templateName, "subject", subject)
	return nil
}

func (m *Mailer) Close() error { return nil }
