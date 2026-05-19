package com.mss301.petclinic.reviews.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.mss301.petclinic.common.web.exception.ExternalServiceUnavailableException;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;

/**
 * Facade bao bọc cross-service HTTP calls + Resilience4j circuit breakers.
 *
 * <h4>Vì sao tách bean riêng?</h4>
 * Spring AOP intercept method qua proxy ĐƯỢC TẠO QUANH bean. Khi
 * {@code ReviewServiceImpl.create()} gọi {@code this.fetchVisit(...)} trong cùng class,
 * Java resolve method trực tiếp trên object — KHÔNG đi qua proxy → annotation
 * {@code @CircuitBreaker} không kick in (self-invocation trap — gotcha #28).
 *
 * <p>Đặt CB methods trong bean tách riêng + inject vào caller → mỗi call đi qua proxy →
 * R4j aspect chặn được → fallback + state machine hoạt động đúng.
 *
 * <p>{@code HttpClientErrorException.NotFound} (visit không tồn tại) bubble lên caller
 * (ignore-exceptions trong config-repo/reviews-service.yml) — caller phân loại
 * 404 (data missing) vs 503 (service down).
 */
@Component
public class RemoteClientsFacade {

    private static final Logger log = LoggerFactory.getLogger(RemoteClientsFacade.class);

    private final VisitsClient visitsClient;

    public RemoteClientsFacade(VisitsClient visitsClient) {
        this.visitsClient = visitsClient;
    }

    @CircuitBreaker(name = "visits-service", fallbackMethod = "fetchVisitFallback")
    public VisitSummary fetchVisit(Long visitId) {
        return visitsClient.getVisit(visitId);
    }

    @SuppressWarnings("unused") // referenced by @CircuitBreaker fallbackMethod
    private VisitSummary fetchVisitFallback(Long visitId, Throwable t) {
        log.warn("visits-service circuit OPEN/down (visitId={}): {}", visitId, t.toString());
        throw new ExternalServiceUnavailableException("visits-service", t);
    }
}
