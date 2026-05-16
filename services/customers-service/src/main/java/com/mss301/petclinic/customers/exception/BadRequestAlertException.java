package com.mss301.petclinic.customers.exception;

/**
 * Business validation lỗi (vd: "Email đã tồn tại", "Telephone không hợp lệ").
 * Mang theo `entityName` + `errorKey` để FE map message i18n.
 * Pattern lấy từ JHipster.
 */
public class BadRequestAlertException extends RuntimeException {

    private final String entityName;
    private final String errorKey;

    public BadRequestAlertException(String message, String entityName, String errorKey) {
        super(message);
        this.entityName = entityName;
        this.errorKey = errorKey;
    }

    public String getEntityName() {
        return entityName;
    }

    public String getErrorKey() {
        return errorKey;
    }
}
