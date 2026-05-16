package com.mss301.petclinic.customers.exception;

import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.List;

/**
 * Trung tâm xử lý lỗi cho REST API (pattern JHipster).
 *
 * - Extend {@link ResponseEntityExceptionHandler} để tự handle MỌI Spring built-in exception
 *   (404 NoHandlerFound, 405 MethodNotAllowed, 415 MediaTypeNotSupported, …) thành ProblemDetail.
 * - Add custom handler cho domain exception ({@link OwnerNotFoundException},
 *   {@link BadRequestAlertException}) và infra exception (concurrency, access-denied).
 * - Mọi response theo RFC 9457: `type` (URI phân loại), `title`, `status`, `detail`, custom properties.
 */
@RestControllerAdvice
public class ExceptionTranslator extends ResponseEntityExceptionHandler {

    private static final String ALERT_HEADER  = "X-PetClinic-Alert";
    private static final String PARAMS_HEADER = "X-PetClinic-Params";

    // ---------------------------------------------------------------------
    // Domain exceptions
    // ---------------------------------------------------------------------

    @ExceptionHandler(OwnerNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleOwnerNotFound(OwnerNotFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setType(ErrorConstants.ENTITY_NOT_FOUND_TYPE);
        pd.setTitle("Entity not found");
        pd.setProperty("entityName", "Owner");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(pd);
    }

    @ExceptionHandler(BadRequestAlertException.class)
    public ResponseEntity<ProblemDetail> handleBadRequestAlert(BadRequestAlertException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setType(ErrorConstants.BAD_REQUEST_TYPE);
        pd.setTitle("Bad request");
        pd.setProperty("entityName", ex.getEntityName());
        pd.setProperty("errorKey", ex.getErrorKey());
        return ResponseEntity.badRequest()
                .header(ALERT_HEADER, "error." + ex.getErrorKey())
                .header(PARAMS_HEADER, ex.getEntityName())
                .body(pd);
    }

    // ---------------------------------------------------------------------
    // Infrastructure exceptions
    // ---------------------------------------------------------------------

    @ExceptionHandler(ConcurrencyFailureException.class)
    public ResponseEntity<ProblemDetail> handleConcurrency(ConcurrencyFailureException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        pd.setType(ErrorConstants.CONCURRENCY_TYPE);
        pd.setTitle("Concurrency conflict");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(pd);
    }

    // AccessDeniedException handler — sẽ thêm khi customers-service tích hợp Spring Security.

    // ---------------------------------------------------------------------
    // Override parent — Spring built-in exceptions (validation, message-not-readable, …)
    // ---------------------------------------------------------------------

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ) {
        List<FieldErrorDto> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> new FieldErrorDto(err.getField(), err.getCode(), err.getDefaultMessage()))
                .toList();

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, "Invalid payload");
        pd.setType(ErrorConstants.INVALID_PAYLOAD_TYPE);
        pd.setTitle("Validation failed");
        pd.setProperty("fieldErrors", fieldErrors);

        return new ResponseEntity<>(pd, headers, status);
    }

    public record FieldErrorDto(String field, String code, String message) {}
}
