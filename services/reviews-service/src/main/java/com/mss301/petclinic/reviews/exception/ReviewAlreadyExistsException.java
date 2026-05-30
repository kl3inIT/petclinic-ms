package com.mss301.petclinic.reviews.exception;

import java.io.Serial;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.reviews.model.TargetType;

/**
 * Throw khi user đã review target này rồi. Adopt rule "1 user 1 review/target" từ
 * Champlain products-Rating composite identity.
 *
 * <p>Detection: DB UNIQUE (author_id, target_type, target_id) — service check trước
 * để return error rõ thay vì DataIntegrityViolation.
 */
public class ReviewAlreadyExistsException extends BadRequestAlertException {

    @Serial
    private static final long serialVersionUID = 1L;

    public ReviewAlreadyExistsException(TargetType targetType, String targetId) {
        super("Bạn đã review " + targetType + " " + targetId + " rồi",
                "Review", "already-exists");
    }
}
