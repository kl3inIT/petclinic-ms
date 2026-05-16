package com.mss301.petclinic.gateway.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.function.HandlerFilterFunction;
import org.springframework.web.servlet.function.ServerResponse;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Simple in-memory per-IP rate limiter as a Spring MVC functional filter.
 *
 * <h4>Algorithm</h4>
 * Sliding window approximation: 1 bucket per IP, reset {@code period} sau lần đầu tiên trong window.
 * Hết quota → 429. Race condition: dùng AtomicLong count + AtomicLong windowStart, thread-safe đủ
 * cho dev/single-instance gateway.
 *
 * <h4>Prod</h4>
 * Multi-instance gateway → cần shared store (Redis qua {@code spring-data-redis-reactive} +
 * {@code RedisRateLimiter}). Hoặc nâng lên Spring Cloud Gateway Reactive variant.
 *
 * <h4>Caveats (đã chấp nhận cho learning project)</h4>
 * <ul>
 *   <li>Memory grows với # unique IPs. Eviction: chỉ khi bucket window expire (đủ cho dev).</li>
 *   <li>NAT/proxy → nhiều user chung 1 IP cùng bucket. Production cần kết hợp với user ID nếu authenticated.</li>
 *   <li>X-Forwarded-For chưa parse (cần trusted proxy config) — dùng remoteAddr trực tiếp.</li>
 * </ul>
 */
public class PerIpRateLimit {

    private static final Logger log = LoggerFactory.getLogger(PerIpRateLimit.class);

    private final int capacity;
    private final long periodMillis;
    private final ConcurrentMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public PerIpRateLimit(int capacity, Duration period) {
        this.capacity = capacity;
        this.periodMillis = period.toMillis();
    }

    /**
     * {@code HandlerFilterFunction} compatible với {@code GatewayRouterFunctions.route(...).filter(...)}.
     */
    public HandlerFilterFunction<ServerResponse, ServerResponse> asFilter() {
        return (request, next) -> {
            String ip = request.servletRequest().getRemoteAddr();
            Bucket bucket = buckets.computeIfAbsent(ip, k -> new Bucket());
            if (!bucket.tryAcquire()) {
                log.warn("Rate limit exceeded for ip={} on path={}", ip, request.path());
                return ServerResponse.status(HttpStatus.TOO_MANY_REQUESTS)
                        .header("Retry-After", String.valueOf(periodMillis / 1000))
                        .body("""
                                {"type":"https://petclinic-ms.mss301/problem/rate-limited",\
                                "title":"Rate limit exceeded",\
                                "status":429,\
                                "detail":"Too many requests from this IP. Retry after %d seconds."}\
                                """.formatted(periodMillis / 1000));
            }
            return next.handle(request);
        };
    }

    private class Bucket {
        private final AtomicLong windowStart = new AtomicLong(System.currentTimeMillis());
        private final AtomicLong count = new AtomicLong(0);

        boolean tryAcquire() {
            long now = System.currentTimeMillis();
            long start = windowStart.get();
            if (now - start >= periodMillis) {
                if (windowStart.compareAndSet(start, now)) {
                    count.set(0);
                }
            }
            return count.incrementAndGet() <= capacity;
        }
    }
}
