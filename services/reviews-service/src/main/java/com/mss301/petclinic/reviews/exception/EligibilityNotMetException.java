package com.mss301.petclinic.reviews.exception;

import java.io.Serial;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.reviews.model.TargetType;

/**
 * Throw khi review tạo không thỏa eligibility:
 * <ul>
 *   <li>VET/VISIT: chưa có visit COMPLETED với target này + author</li>
 *   <li>PRODUCT: skip v1 — chưa có billing-service</li>
 * </ul>
 */
public class EligibilityNotMetException extends BadRequestAlertException {

    @Serial
    private static final long serialVersionUID = 1L;

    public EligibilityNotMetException(TargetType targetType, String reason) {
        super("Không đủ điều kiện review " + targetType + ": " + reason,
                "Review", "eligibility");
    }
}
