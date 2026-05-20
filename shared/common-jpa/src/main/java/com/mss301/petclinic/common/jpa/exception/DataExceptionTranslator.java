package com.mss301.petclinic.common.jpa.exception;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.mss301.petclinic.common.web.exception.ErrorConstants;

/**
 * Data-layer exception translator. Tách khỏi common-web's ExceptionTranslator vì
 * {@link ConcurrencyFailureException} nằm trong spring-tx — không phải mọi service
 * (vd: api-gateway) có spring-tx. Module này tự auto-wire khi service có JPA.
 *
 * Format vẫn theo RFC 9457 ProblemDetail — consistent với common-web's translator.
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DataExceptionTranslator {

    @ExceptionHandler(ConcurrencyFailureException.class)
    public ResponseEntity<ProblemDetail> handleConcurrency(ConcurrencyFailureException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        pd.setType(ErrorConstants.CONCURRENCY_TYPE);
        pd.setTitle("Concurrency conflict");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(pd);
    }
}
