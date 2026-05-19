package com.mss301.petclinic.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.common.web.exception.ErrorConstants;

/**
 * Đích forward của CircuitBreaker default filter khi downstream service không reachable.
 * Trả về RFC 9457 ProblemDetail consistent với ExceptionTranslator ở các service khác.
 *
 * Route: bất kỳ HTTP method nào tới /fallback → cùng response.
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
}
