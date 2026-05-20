package com.mss301.petclinic.reviews.exception;

import java.io.Serial;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

/**
 * Throw khi user vote chính review của họ — anti-gaming.
 */
public class SelfVoteForbiddenException extends BadRequestAlertException {

    @Serial
    private static final long serialVersionUID = 1L;

    public SelfVoteForbiddenException() {
        super("Không thể vote chính review của bạn",
                "Review", "self-vote-forbidden");
    }
}
