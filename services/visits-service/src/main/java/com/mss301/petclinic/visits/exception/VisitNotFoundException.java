package com.mss301.petclinic.visits.exception;

import java.io.Serial;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class VisitNotFoundException extends ResourceNotFoundException {

    @Serial
    private static final long serialVersionUID = 1L;

    public VisitNotFoundException(String id) {
        super("Visit", id);
    }
}
