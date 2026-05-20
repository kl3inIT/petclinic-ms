package com.mss301.petclinic.visits.exception;

import java.io.Serial;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.visits.model.VisitStatus;

public class IllegalVisitTransitionException extends BadRequestAlertException {

    @Serial
    private static final long serialVersionUID = 1L;

    public IllegalVisitTransitionException(VisitStatus from, VisitStatus to) {
        super("Visit không thể chuyển từ " + from + " sang " + to,
                "Visit", "illegal-transition");
    }
}
