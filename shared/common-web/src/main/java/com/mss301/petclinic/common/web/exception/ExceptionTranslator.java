package com.mss301.petclinic.common.web.exception;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

/**
 * Trung tâm xử lý lỗi cho mọi service. Auto-wired bởi {@code PetClinicWebAutoConfiguration}.
 *
 * <h4>Design notes</h4>
 * <ul>
 *   <li>KHÔNG extends {@code ResponseEntityExceptionHandler} — Spring Boot 4
 *       {@code spring.mvc.problemdetails.enabled=true} đã tự convert built-in exceptions
 *       (404 NoHandlerFound, 405, 415, 400 HttpMessageNotReadable, …) thành {@code ProblemDetail}.
 *       Extends parent class sẽ gây ambiguous {@code @ExceptionHandler} mapping cho
 *       {@link MethodArgumentNotValidException}.</li>
 *   <li>{@code @Order(HIGHEST_PRECEDENCE)} — đảm bảo handlers tại đây thắng Spring built-in
 *       (vd: custom format cho validation error).</li>
 *   <li>Handle base {@code ResourceNotFoundException} → bắt mọi subclass tự động
 *       (OwnerNotFoundException, VetNotFoundException, …).</li>
 *   <li>Response theo RFC 9457: {@code type}, {@code title}, {@code status}, {@code detail} + custom property.</li>
 * </ul>
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ExceptionTranslator {

    private static final String ALERT_HEADER  = "X-PetClinic-Alert";
    private static final String PARAMS_HEADER = "X-PetClinic-Params";

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setType(ErrorConstants.ENTITY_NOT_FOUND_TYPE);
        pd.setTitle("Entity not found");
        pd.setProperty("entityName", ex.getEntityName());
        pd.setProperty("resourceId", ex.getResourceId());
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

    /**
     * Validation error từ {@code @Valid @RequestBody}. Trả về fieldErrors array — FE map từng field.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        List<FieldErrorDto> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> new FieldErrorDto(err.getField(), err.getCode(), err.getDefaultMessage()))
                .toList();

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Invalid payload");
        pd.setType(ErrorConstants.INVALID_PAYLOAD_TYPE);
        pd.setTitle("Validation failed");
        pd.setProperty("fieldErrors", fieldErrors);

        return ResponseEntity.badRequest().body(pd);
    }

    public record FieldErrorDto(String field, String code, String message) {}
}
