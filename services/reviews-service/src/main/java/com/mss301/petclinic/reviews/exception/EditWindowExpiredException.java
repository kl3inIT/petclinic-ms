package com.mss301.petclinic.reviews.exception;

import java.io.Serial;
import java.time.Duration;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

/**
 * Throw khi user PATCH review quá window cho phép (mặc định 7 ngày từ {@code created_date}).
 * Edit window business rule, không phải state-machine error.
 */
public class EditWindowExpiredException extends BadRequestAlertException {

    @Serial
    private static final long serialVersionUID = 1L;

    public EditWindowExpiredException(Duration window) {
        super("Review không thể chỉnh sửa sau " + window.toDays() + " ngày kể từ lúc tạo",
                "Review", "edit-window-expired");
    }
}
