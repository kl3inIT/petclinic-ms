package com.mss301.petclinic.common.web.exception;

/**
 * Downstream service không phản hồi / chậm / circuit OPEN.
 *
 * <p>Khác với {@link ResourceNotFoundException} (downstream OK nhưng không có data) —
 * cái này nghĩa là downstream KHÔNG HEALTHY. Mapped → HTTP 503 trong
 * {@link ExceptionTranslator}, kèm header {@code Retry-After} để client biết nên thử lại.
 *
 * <p>Throw từ circuit-breaker fallback method khi không có cached fallback nào dùng được
 * (như case validate pet/vet trước khi book visit — không cho phép book mù).
 */
public class ExternalServiceUnavailableException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final String serviceName;
    private final long retryAfterSeconds;

    public ExternalServiceUnavailableException(String serviceName, Throwable cause) {
        super(serviceName + " tạm thời không khả dụng", cause);
        this.serviceName = serviceName;
        this.retryAfterSeconds = 30L;
    }

    public String getServiceName() {
        return serviceName;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
