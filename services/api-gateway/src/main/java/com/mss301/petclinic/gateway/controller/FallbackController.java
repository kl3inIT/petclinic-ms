package com.mss301.petclinic.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.mss301.petclinic.common.web.exception.ErrorConstants;

import io.github.resilience4j.bulkhead.BulkheadFullException;

/**
 * Đích forward của CircuitBreaker default filter khi downstream service không reachable.
 * Trả về RFC 9457 ProblemDetail consistent với ExceptionTranslator ở các service khác.
 *
 * Route: bất kỳ HTTP method nào tới /fallback → cùng response.
 *
 * <p>BulkheadFullException được handle thông qua {@link BulkheadAdvice} bên dưới — bulkhead
 * reject KHÔNG forward về /fallback (filter throw exception trước khi tới CircuitBreaker).
 */
@RestController
public class FallbackController {

    @RequestMapping("/fallback")
    public ResponseEntity<ProblemDetail> fallback() {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Downstream service is unavailable or timed out. Please retry."
        );
        pd.setType(ErrorConstants.SERVICE_UNAVAILABLE_TYPE);
        pd.setTitle("Service unavailable");
        pd.setProperty("upstream", "gateway");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(pd);
    }

    /**
     * Global advice cho {@link BulkheadFullException} — fail-fast khi concurrency limit hit.
     * 503 + Retry-After để client backoff. Reason: bulkhead full ≠ service down (gateway healthy);
     * dùng {@code overloaded} type URI riêng để client distinguish (tracing/metrics).
     */
    @RestControllerAdvice
    static class BulkheadAdvice {

        @ExceptionHandler(BulkheadFullException.class)
        public ResponseEntity<ProblemDetail> handleBulkheadFull(BulkheadFullException ex) {
            ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Too many concurrent requests. Please retry shortly."
            );
            pd.setType(java.net.URI.create("https://petclinic.example/problem/bulkhead-full"));
            pd.setTitle("Service temporarily overloaded");
            pd.setProperty("upstream", "gateway");
            pd.setProperty("bulkhead", ex.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .header("Retry-After", "1")
                    .body(pd);
        }
    }
}
