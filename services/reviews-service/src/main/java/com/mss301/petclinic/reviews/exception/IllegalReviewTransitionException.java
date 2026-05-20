package com.mss301.petclinic.reviews.exception;

import java.io.Serial;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.reviews.model.ReviewStatus;

public class IllegalReviewTransitionException extends BadRequestAlertException {

    @Serial
    private static final long serialVersionUID = 1L;

    public IllegalReviewTransitionException(ReviewStatus from, ReviewStatus to) {
        super("Review không thể chuyển từ " + from + " sang " + to,
                "Review", "illegal-transition");
    }
}
