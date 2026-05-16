package com.mss301.petclinic.common.web.exception;

/**
 * Business validation lỗi (vd: "Email đã tồn tại", "Specialty không tồn tại").
 * Mang `entityName` + `errorKey` để FE map i18n.
 * Service throw trực tiếp class này — KHÔNG cần subclass.
 */
public class BadRequestAlertException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final String entityName;
    private final String errorKey;

    public BadRequestAlertException(String message, String entityName, String errorKey) {
        super(message);
        this.entityName = entityName;
        this.errorKey = errorKey;
    }

    public String getEntityName() { return entityName; }
    public String getErrorKey() { return errorKey; }
}
