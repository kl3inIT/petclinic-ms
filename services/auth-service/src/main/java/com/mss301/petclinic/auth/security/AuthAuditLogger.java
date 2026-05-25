package com.mss301.petclinic.auth.security;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

/**
 * Structured audit log cho mọi auth event (ECS schema — Loki/Elasticsearch parse trực tiếp).
 *
 * <p>Field names follow Elastic Common Schema (ECS).
 * Prod profile dùng structured-logging ECS format — JSON lines parse-friendly.
 * Dev plain text + MDC fields hiển thị qua correlation pattern.</p>
 *
 * <p>Mỗi method dùng {@code try/finally} (KHÔNG try-with-resources) — tránh javac {@code [try]}
 * warning khi resource không reference trong body.</p>
 */
@Component
public class AuthAuditLogger {

    private static final Logger log = LoggerFactory.getLogger("petclinic.auth.audit");

    // ECS field keys
    private static final String K_ACTION  = "event.action";
    private static final String K_OUTCOME = "event.outcome";
    private static final String K_REASON  = "event.reason";
    private static final String K_USER_ID = "user.id";
    private static final String K_USER    = "user.name";

    // ECS outcome values
    private static final String OUTCOME_SUCCESS = "success";
    private static final String OUTCOME_FAILURE = "failure";

    // Action constants
    private static final String ACTION_LOGIN_SUCCESS    = "authentication.login.success";
    private static final String ACTION_LOGIN_FAILURE    = "authentication.login.failure";
    private static final String ACTION_REGISTER_SUCCESS = "authentication.register.success";
    private static final String ACTION_REFRESH_SUCCESS  = "authentication.token.refresh.success";
    private static final String ACTION_REFRESH_FAILURE  = "authentication.token.refresh.failure";
    private static final String ACTION_LOGOUT_SUCCESS   = "authentication.logout.success";
    private static final String ACTION_EVENT_PUBLISH_FAILURE = "event.publish.failure";
    private static final String ACTION_CUSTOMER_LINKED  = "authorization.customer.linked";
    private static final String ACTION_VET_LINKED       = "authorization.vet.linked";
    private static final String ACTION_PASSWORD_CHANGE_SUCCESS = "authentication.password.change.success";
    private static final String ACTION_PASSWORD_CHANGE_FAILURE = "authentication.password.change.failure";

    public void loginSuccess(UUID userId, String username) {
        try {
            putBase(ACTION_LOGIN_SUCCESS, OUTCOME_SUCCESS);
            MDC.put(K_USER_ID, userId.toString());
            MDC.put(K_USER, username);
            log.info("Login success");
        } finally {
            clearAll();
        }
    }

    public void loginFailure(String username, String reason) {
        try {
            putBase(ACTION_LOGIN_FAILURE, OUTCOME_FAILURE);
            if (username != null) MDC.put(K_USER, username);
            MDC.put(K_REASON, reason);
            log.warn("Login failure");
        } finally {
            clearAll();
        }
    }

    public void registerSuccess(UUID userId, String username) {
        try {
            putBase(ACTION_REGISTER_SUCCESS, OUTCOME_SUCCESS);
            MDC.put(K_USER_ID, userId.toString());
            MDC.put(K_USER, username);
            log.info("Register success");
        } finally {
            clearAll();
        }
    }

    public void refreshSuccess(UUID userId) {
        try {
            putBase(ACTION_REFRESH_SUCCESS, OUTCOME_SUCCESS);
            MDC.put(K_USER_ID, userId.toString());
            log.info("Refresh token rotated");
        } finally {
            clearAll();
        }
    }

    public void refreshFailure(String reason) {
        try {
            putBase(ACTION_REFRESH_FAILURE, OUTCOME_FAILURE);
            MDC.put(K_REASON, reason);
            log.warn("Refresh token failure");
        } finally {
            clearAll();
        }
    }

    /**
     * Broker tạm down hoặc bị reject — register vẫn ok, mailer mất 1 event.
     * Production thật cứng sẽ dùng outbox pattern; ở đây log đủ để dev biết.
     */
    public void eventPublishFailure(String eventType, UUID userId, String reason) {
        try {
            putBase(ACTION_EVENT_PUBLISH_FAILURE, OUTCOME_FAILURE);
            MDC.put(K_USER_ID, userId.toString());
            MDC.put(K_REASON, reason);
            log.warn("Event publish failure: {}", eventType);
        } finally {
            clearAll();
        }
    }

    public void logoutSuccess(UUID userId) {
        try {
            putBase(ACTION_LOGOUT_SUCCESS, OUTCOME_SUCCESS);
            MDC.put(K_USER_ID, userId.toString());
            log.info("Logout success");
        } finally {
            clearAll();
        }
    }

    /**
     * Phase L — admin link user ↔ customer (owner). Audit trail bắt buộc vì là privilege escalation
     * (user gain quyền truy cập pet/visit của customer). MDC carry adminId/targetUserId/customerId
     * để search Loki/Elastic ngược.
     */
    public void customerLinked(UUID adminId, UUID targetUserId, Long customerId) {
        try {
            putBase(ACTION_CUSTOMER_LINKED, OUTCOME_SUCCESS);
            if (adminId != null) MDC.put("actor.user.id", adminId.toString());
            MDC.put(K_USER_ID, targetUserId.toString());
            MDC.put("customer.id", customerId.toString());
            log.info("Customer linked to user");
        } finally {
            MDC.remove("actor.user.id");
            MDC.remove("customer.id");
            clearAll();
        }
    }

    /**
     * Phase K — admin link user ↔ vet. Audit trail bắt buộc vì privilege escalation
     * (user gain ROLE_VET capabilities qua claim vetId). MDC mirror customerLinked.
     */
    public void vetLinked(UUID adminId, UUID targetUserId, Long vetId) {
        try {
            putBase(ACTION_VET_LINKED, OUTCOME_SUCCESS);
            if (adminId != null) MDC.put("actor.user.id", adminId.toString());
            MDC.put(K_USER_ID, targetUserId.toString());
            MDC.put("vet.id", vetId.toString());
            log.info("Vet linked to user");
        } finally {
            MDC.remove("actor.user.id");
            MDC.remove("vet.id");
            clearAll();
        }
    }

    /** User tự đổi mật khẩu thành công — refresh tokens revoke trên các device khác. */
    public void passwordChangeSuccess(UUID userId) {
        try {
            putBase(ACTION_PASSWORD_CHANGE_SUCCESS, OUTCOME_SUCCESS);
            MDC.put(K_USER_ID, userId.toString());
            log.info("Password changed");
        } finally {
            clearAll();
        }
    }

    /** Currentpassword sai — brute-force signal khi cùng userId nhiều lần / phút. */
    public void passwordChangeFailure(UUID userId) {
        try {
            putBase(ACTION_PASSWORD_CHANGE_FAILURE, OUTCOME_FAILURE);
            MDC.put(K_USER_ID, userId.toString());
            log.warn("Password change failed: invalid current password");
        } finally {
            clearAll();
        }
    }

    private static void putBase(String action, String outcome) {
        MDC.put(K_ACTION, action);
        MDC.put(K_OUTCOME, outcome);
    }

    private static void clearAll() {
        MDC.remove(K_ACTION);
        MDC.remove(K_OUTCOME);
        MDC.remove(K_REASON);
        MDC.remove(K_USER_ID);
        MDC.remove(K_USER);
    }
}
