package com.mss301.petclinic.gateway.config;

import org.springframework.web.servlet.function.HandlerFilterFunction;
import org.springframework.web.servlet.function.ServerResponse;

import io.github.resilience4j.bulkhead.Bulkhead;
import io.github.resilience4j.bulkhead.BulkheadRegistry;

/**
 * Custom Bulkhead filter cho Spring Cloud Gateway WebMVC 5.x.
 *
 * <h4>Tại sao phải tự viết?</h4>
 * Spring Cloud Gateway WebMVC ship sẵn {@code circuitBreaker(...)} và {@code retry(...)} filter
 * shortcut, nhưng <b>KHÔNG có bulkhead</b>. Spring Cloud Circuit Breaker abstraction layer cũng
 * chỉ wrap CircuitBreaker — bulkhead nằm ngoài.
 *
 * <h4>Cơ chế</h4>
 * <ol>
 *   <li>Bulkhead {@link io.github.resilience4j.bulkhead.Bulkhead#tryAcquirePermission()} —
 *       atomic decrement counter; trả {@code false} ngay nếu đã đạt {@code max-concurrent-calls}.</li>
 *   <li>Nếu fail-fast → trả 503 ProblemDetail (consistent với {@link FallbackController}).</li>
 *   <li>Nếu OK → execute downstream chain → {@code releasePermission()} trong finally.</li>
 * </ol>
 *
 * <h4>Semaphore vs ThreadPool</h4>
 * Dùng <b>semaphore variant</b> (default). Java 25 virtual threads + Tomcat → thread cheap,
 * vấn đề thực sự là <i>concurrency limit</i> chứ không phải thread isolation. ThreadPool
 * variant không tương thích {@code @Transactional} (TX context không propagate qua thread).
 *
 * <h4>Usage</h4>
 * <pre>{@code
 * .filter(BulkheadFilterFunctions.bulkhead(registry, "genaiBulkhead"))
 * }</pre>
 *
 * <p>Đặt SAU {@code lb(...)} và TRƯỚC {@code circuitBreaker(...)} — bulkhead reject sớm hơn,
 * không tốn 1 CB slot count.
 */
public final class BulkheadFilterFunctions {

    private BulkheadFilterFunctions() {}

    public static HandlerFilterFunction<ServerResponse, ServerResponse> bulkhead(
            BulkheadRegistry registry, String bulkheadName) {
        Bulkhead bulkhead = registry.bulkhead(bulkheadName);
        return (request, next) -> {
            // acquirePermission() throws BulkheadFullException khi đã đạt max-concurrent-calls.
            // Exception bubble lên @ExceptionHandler(BulkheadFullException) ở FallbackController.
            bulkhead.acquirePermission();
            try {
                return next.handle(request);
            } finally {
                bulkhead.releasePermission();
            }
        };
    }
}
