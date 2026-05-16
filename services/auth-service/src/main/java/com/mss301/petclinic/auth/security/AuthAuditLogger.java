package com.mss301.petclinic.auth.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Structured audit log cho mọi auth event (ECS schema — Loki/Elasticsearch parse trực tiếp).
 *
 * <p>Field names follow Elastic Common Schema (ECS):</p>
 * <ul>
 *   <li>{@code event.action} — vd: {@code authentication.login.success}</li>
 *   <li>{@code event.outcome} — {@code success}/{@code failure}</li>
 *   <li>{@code user.id}, {@code user.name}</li>
 *   <li>{@code client.ip} (Iter sau khi có request context)</li>
 * </ul>
 *
 * <p>Prod profile dùng structured-logging ECS format — JSON lines parsed-friendly.
 * Dev plain text + MDC fields hiển thị trong correlation pattern.</p>
 */
@Component
public class AuthAuditLogger {

    private static final Logger log = LoggerFactory.getLogger("petclinic.auth.audit");

    public void loginSuccess(UUID userId, String username) {
        try (MdcContext ctx = mdc("authentication.login.success", "success", userId, username)) {
            log.info("Login success");
        }
    }

    public void loginFailure(String username, String reason) {
        try (MdcContext ctx = mdc("authentication.login.failure", "failure", null, username)) {
            MDC.put("event.reason", reason);
            log.warn("Login failure");
            MDC.remove("event.reason");
        }
    }

    public void registerSuccess(UUID userId, String username) {
        try (MdcContext ctx = mdc("authentication.register.success", "success", userId, username)) {
            log.info("Register success");
        }
    }

    public void refreshSuccess(UUID userId) {
        try (MdcContext ctx = mdc("authentication.token.refresh.success", "success", userId, null)) {
            log.info("Refresh token rotated");
        }
    }

    public void refreshFailure(String reason) {
        try (MdcContext ctx = mdc("authentication.token.refresh.failure", "failure", null, null)) {
            MDC.put("event.reason", reason);
            log.warn("Refresh token failure");
            MDC.remove("event.reason");
        }
    }

    public void logoutSuccess(UUID userId) {
        try (MdcContext ctx = mdc("authentication.logout.success", "success", userId, null)) {
            log.info("Logout success");
        }
    }

    private static MdcContext mdc(String action, String outcome, UUID userId, String username) {
        MDC.put("event.action", action);
        MDC.put("event.outcome", outcome);
        if (userId != null) MDC.put("user.id", userId.toString());
        if (username != null) MDC.put("user.name", username);
        return MdcContext.INSTANCE;
    }

    /** AutoCloseable cleanup MDC sau log call. */
    private enum MdcContext implements AutoCloseable {
        INSTANCE;
        @Override public void close() {
            MDC.remove("event.action");
            MDC.remove("event.outcome");
            MDC.remove("user.id");
            MDC.remove("user.name");
        }
    }
}
